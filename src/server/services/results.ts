import type { Election, ElectionResults } from "../types";
import { unsealChoice } from "../crypto/ballot-sealing";
import { assertResultVisible } from "../guards/result-visibility";
import { listCandidates } from "../sql/candidates";
import { listSealedBallots } from "../sql/ballots";
import { getParticipation } from "../sql/submissions";

/**
 * 결과 집계 서비스.
 *
 * 이 모듈이 후보별 득표를 계산할 수 있는 유일한 경로다.
 * - assertResultVisible: result_visible_at 이전이면 즉시 throw
 * - unsealChoice: 복호화 함수 내부에도 동일 guard가 한 번 더 있다
 * 집계 대상은 검수에서 승인되어 익명 투표함(ballots)으로 이동한 표뿐이다.
 * 결과 발표 전에 후보별 count를 얻을 수 있는 app-level 함수는 존재하지 않는다.
 */
export async function aggregateResults(
  election: Election,
  now = new Date(),
): Promise<ElectionResults> {
  // 이중 가드: service 레벨 + 복호화 함수 내장 가드
  assertResultVisible(election, now);

  const [candidates, sealedBallots, participation] = await Promise.all([
    listCandidates(election.id),
    listSealedBallots(election.id),
    getParticipation(election.id),
  ]);

  const counts = new Map<string, number>(candidates.map((c) => [c.id, 0]));
  let unmatchedBallots = 0;
  const messages: string[] = [];
  const messagesPerCandidate = new Map<string, string[]>(
    candidates.map((c) => [c.id, []]),
  );

  for (const sealed of sealedBallots) {
    const choice = unsealChoice(sealed, {
      resultVisibleAt: election.resultVisibleAt,
      now,
    });
    // 다른 선거의 투표지가 섞이는 것을 방어 (암호문 무결성 + 논리 검증)
    if (choice.electionId !== election.id || !counts.has(choice.candidateId)) {
      unmatchedBallots++;
      continue;
    }
    counts.set(choice.candidateId, (counts.get(choice.candidateId) ?? 0) + 1);
    if (choice.message) {
      messages.push(choice.message);
      messagesPerCandidate.get(choice.candidateId)?.push(choice.message);
    }
  }

  // 제출 순서와의 상관관계를 끊기 위해 텍스트 기준 정렬
  messages.sort((a, b) => a.localeCompare(b, "ko"));
  for (const list of messagesPerCandidate.values()) {
    list.sort((a, b) => a.localeCompare(b, "ko"));
  }

  const totalBallots = sealedBallots.length;
  const maxVotes = Math.max(0, ...counts.values());
  const winnerIds =
    totalBallots === 0
      ? []
      : candidates.filter((c) => counts.get(c.id) === maxVotes).map((c) => c.id);

  // 상영관용: 득표 오름차순 (당선자가 마지막에 재생되도록)
  const messagesByCandidate = candidates
    .map((c) => ({
      candidateId: c.id,
      name: c.name,
      slogan: c.slogan,
      colorHint: c.colorHint,
      isWinner: winnerIds.includes(c.id),
      messages: messagesPerCandidate.get(c.id) ?? [],
    }))
    .filter((c) => c.messages.length > 0)
    .sort(
      (a, b) =>
        (counts.get(a.candidateId) ?? 0) - (counts.get(b.candidateId) ?? 0),
    );

  return {
    messagesByCandidate,
    totalBallots,
    totalSubmitted: participation.submitted,
    pendingCount: participation.pending,
    rejectedCount: participation.rejected,
    isTie: winnerIds.length > 1,
    winnerIds,
    unmatchedBallots,
    messages,
    perCandidate: candidates
      .map((c) => {
        const votes = counts.get(c.id) ?? 0;
        return {
          candidateId: c.id,
          name: c.name,
          slogan: c.slogan,
          colorHint: c.colorHint,
          votes,
          percent:
            totalBallots === 0
              ? 0
              : Math.round((votes / totalBallots) * 1000) / 10,
        };
      })
      .sort((a, b) => b.votes - a.votes),
  };
}

import type { Election, ElectionResults } from "../types";
import { unsealChoice } from "../crypto/ballot-sealing";
import { assertResultVisible } from "../guards/result-visibility";
import { listCandidates } from "../sql/candidates";
import { listSealedBallots } from "../sql/ballots";
import { getTurnout } from "../sql/voters";

/**
 * 결과 집계 서비스.
 *
 * 이 모듈이 후보별 득표를 계산할 수 있는 유일한 경로다.
 * - assertResultVisible: result_visible_at 이전이면 즉시 throw
 * - unsealChoice: 복호화 함수 내부에도 동일 guard가 한 번 더 있다
 * 결과 발표 전에 후보별 count를 얻을 수 있는 app-level 함수는 존재하지 않는다.
 */
export async function aggregateResults(
  election: Election,
  now = new Date(),
): Promise<ElectionResults> {
  // 이중 가드: service 레벨 + 복호화 함수 내장 가드
  assertResultVisible(election, now);

  const [candidates, sealedBallots, turnout] = await Promise.all([
    listCandidates(election.id),
    listSealedBallots(election.id),
    getTurnout(election.id),
  ]);

  const counts = new Map<string, number>(candidates.map((c) => [c.id, 0]));
  let unmatchedBallots = 0;

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
  }

  const totalBallots = sealedBallots.length;
  const maxVotes = Math.max(0, ...counts.values());
  const winnerIds =
    totalBallots === 0
      ? []
      : candidates.filter((c) => counts.get(c.id) === maxVotes).map((c) => c.id);

  return {
    totalBallots,
    totalVoters: turnout.totalVoters,
    turnoutPercent: turnout.percent,
    isTie: winnerIds.length > 1,
    winnerIds,
    unmatchedBallots,
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

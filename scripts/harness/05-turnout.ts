/**
 * Harness 5: Participation Harness
 * 예상 유권자 30명 / 투표 7건 승인 → 투표율 23.3%,
 * 발표 전 후보별 득표 비공개, 검수 결과가 현황에 반영되는지 검증한다.
 */
import "../lib/bootstrap";
import { closePool } from "../../src/server/db";
import { submitVote } from "../../src/server/services/vote";
import { approveSubmission, rejectSubmission } from "../../src/server/services/review";
import { aggregateResults } from "../../src/server/services/results";
import { getParticipation } from "../../src/server/sql/submissions";
import { getElection } from "../../src/server/sql/elections";
import { ResultsSealedError } from "../../src/server/crypto/ballot-sealing";
import {
  check,
  finish,
  makeTestAdmin,
  makeTestElection,
  revealResults,
} from "./lib/util";

async function main() {
  console.log("[Harness 5] Participation");

  const { election, candidateIds } = await makeTestElection({
    title: "현황 하네스",
    expectedVoters: 30,
    resultVisibleAt: new Date(Date.now() + 86400_000),
  });
  const adminId = await makeTestAdmin("turnout-harness@calmvote.local");

  // 8명 투표 (후보A 4표, 후보B 3표 승인 예정 + 1명은 무효 처리 예정)
  const submissionIds: string[] = [];
  for (let i = 0; i < 8; i++) {
    const r = await submitVote({
      electionId: election.id,
      voterName: `현황테스터${i}`,
      candidateId: candidateIds[i < 4 ? 0 : 1],
    });
    if (!r.ok) throw new Error(`투표 ${i} 실패: ${r.message}`);
    submissionIds.push(r.submissionId);
  }

  // 검수 전 현황
  let p = await getParticipation(election.id);
  check("접수 8건", p.submitted === 8);
  check("검수 대기 8건", p.pending === 8);
  check("승인 0건 → 투표율 0%", p.approved === 0 && p.percent === 0);

  // 7건 승인 + 1건 무효 — 검수가 처리될 때마다 현황이 갱신된다
  for (let i = 0; i < 7; i++) {
    const r = await approveSubmission(submissionIds[i], adminId);
    if (!r.ok) throw new Error(`승인 ${i} 실패`);
  }
  await rejectSubmission(submissionIds[7], adminId, "명단에 없는 이름");

  p = await getParticipation(election.id);
  check("승인 7건", p.approved === 7);
  check("무효 1건", p.rejected === 1);
  check("검수 대기 0건", p.pending === 0);
  check(`투표율 23.3% (실제: ${p.percent}%)`, p.percent === 23.3);

  // 발표 전 후보별 득표 비공개
  let sealedBlocked = false;
  try {
    await aggregateResults(election);
  } catch (e) {
    sealedBlocked = e instanceof ResultsSealedError;
  }
  check("발표 전 후보별 득표 집계 차단", sealedBlocked);

  // 발표 후 득표 표시 (무효 1건은 집계에서 제외)
  await revealResults(election.id);
  const revealed = await getElection(election.id);
  if (!revealed) throw new Error("선거 조회 실패");
  const results = await aggregateResults(revealed);
  const a = results.perCandidate.find((c) => c.candidateId === candidateIds[0]);
  const b = results.perCandidate.find((c) => c.candidateId === candidateIds[1]);
  check("발표 후 후보A 4표", a?.votes === 4);
  check("발표 후 후보B 3표", b?.votes === 3);
  check("무효표는 개표에 미포함 (총 7표)", results.totalBallots === 7);
  check("당선자 = 후보A", results.winnerIds.length === 1 && results.winnerIds[0] === candidateIds[0]);
  check("동률 아님", !results.isTie);

  finish("Harness 5");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

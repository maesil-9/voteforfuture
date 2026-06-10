/**
 * Harness 7: Result Seal Harness
 * result_visible_at 전에는 어떤 경로로도 개표가 불가능하고,
 * 이후에는 정상 집계되는지 검증한다.
 */
import "../lib/bootstrap";
import { closePool } from "../../src/server/db";
import { submitVote } from "../../src/server/services/vote";
import { approveSubmission } from "../../src/server/services/review";
import { aggregateResults } from "../../src/server/services/results";
import { getElection } from "../../src/server/sql/elections";
import { listSealedBallots } from "../../src/server/sql/ballots";
import {
  ResultsSealedError,
  unsealChoice,
} from "../../src/server/crypto/ballot-sealing";
import { assertResultVisible } from "../../src/server/guards/result-visibility";
import {
  check,
  finish,
  makeTestAdmin,
  makeTestElection,
  revealResults,
} from "./lib/util";

async function main() {
  console.log("[Harness 7] Result Seal");

  // 1. result_visible_at이 미래인 선거
  const { election, candidateIds } = await makeTestElection({
    title: "봉인 하네스",
    resultVisibleAt: new Date(Date.now() + 86400_000),
  });
  const adminId = await makeTestAdmin("seal-harness@calmvote.local");

  for (let i = 0; i < 3; i++) {
    const r = await submitVote({
      electionId: election.id,
      voterName: `봉인테스터${i}`,
      candidateId: candidateIds[i % 2],
    });
    if (!r.ok) throw new Error(`투표 실패: ${r.message}`);
    const approval = await approveSubmission(r.submissionId, adminId);
    if (!approval.ok) throw new Error("승인 실패");
  }

  // 2~5. 봉인 상태 검증 — 모든 레벨에서 차단
  let guardBlocked = false;
  try {
    assertResultVisible(election);
  } catch (e) {
    guardBlocked = e instanceof ResultsSealedError;
  }
  check("visibility guard 차단", guardBlocked);

  let serviceBlocked = false;
  try {
    await aggregateResults(election);
  } catch (e) {
    serviceBlocked = e instanceof ResultsSealedError;
  }
  check("service 레벨 집계 차단", serviceBlocked);

  // 복호화 함수 자체의 내장 guard도 차단해야 한다 (가장 낮은 레벨)
  const sealed = await listSealedBallots(election.id);
  check("승인된 3표가 익명 투표함에 존재", sealed.length === 3);
  let decryptBlocked = false;
  try {
    unsealChoice(sealed[0], { resultVisibleAt: election.resultVisibleAt });
  } catch (e) {
    decryptBlocked = e instanceof ResultsSealedError;
  }
  check("복호화 함수 내장 guard 차단", decryptBlocked);

  // 6~7. result_visible_at을 과거로 → 집계 표시
  await revealResults(election.id);
  const revealed = await getElection(election.id);
  if (!revealed) throw new Error("선거 조회 실패");
  const results = await aggregateResults(revealed);
  check("발표 후 집계 정상", results.totalBallots === 3);
  check(
    "득표 합계 = 총 개표 수",
    results.perCandidate.reduce((s, c) => s + c.votes, 0) === 3,
  );

  finish("Harness 7");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

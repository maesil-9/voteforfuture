/**
 * Harness 5: Turnout Harness
 * 유권자 30명 / 투표 7건 → 투표율 23.3%, 발표 전 후보별 득표 비공개.
 */
import "../lib/bootstrap";
import { closePool } from "../../src/server/db";
import { submitVote } from "../../src/server/services/vote";
import { aggregateResults } from "../../src/server/services/results";
import { getTurnout } from "../../src/server/sql/voters";
import { getElection } from "../../src/server/sql/elections";
import { hashCode } from "../../src/server/crypto/code-hash";
import { ResultsSealedError } from "../../src/server/crypto/ballot-sealing";
import { check, finish, makeTestElection, revealResults } from "./lib/util";

async function main() {
  console.log("[Harness 5] Turnout");

  const { election, candidateIds, codes } = await makeTestElection({
    title: "투표율 하네스",
    voterCount: 30,
    resultVisibleAt: new Date(Date.now() + 86400_000),
  });

  // 7명 투표 (후보A 4표, 후보B 3표)
  for (let i = 0; i < 7; i++) {
    const r = await submitVote({
      electionId: election.id,
      codeHash: hashCode(codes[i]),
      candidateId: candidateIds[i < 4 ? 0 : 1],
    });
    if (!r.ok) throw new Error(`투표 ${i} 실패: ${r.message}`);
  }

  // 투표율 23.3%
  const turnout = await getTurnout(election.id);
  check("총 유권자 30명", turnout.totalVoters === 30);
  check("투표 완료 7건", turnout.votesCast === 7);
  check("남은 투표 23건", turnout.remaining === 23);
  check(`투표율 23.3% (실제: ${turnout.percent}%)`, turnout.percent === 23.3);

  // 발표 전 후보별 득표 비공개
  let sealedBlocked = false;
  try {
    await aggregateResults(election);
  } catch (e) {
    sealedBlocked = e instanceof ResultsSealedError;
  }
  check("발표 전 후보별 득표 집계 차단", sealedBlocked);

  // 발표 후 득표 표시
  await revealResults(election.id);
  const revealed = await getElection(election.id);
  if (!revealed) throw new Error("선거 조회 실패");
  const results = await aggregateResults(revealed);
  const a = results.perCandidate.find((c) => c.candidateId === candidateIds[0]);
  const b = results.perCandidate.find((c) => c.candidateId === candidateIds[1]);
  check("발표 후 후보A 4표", a?.votes === 4);
  check("발표 후 후보B 3표", b?.votes === 3);
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

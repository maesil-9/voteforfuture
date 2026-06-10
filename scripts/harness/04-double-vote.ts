/**
 * Harness 4: Double Vote Harness
 * 같은 코드의 두 번째 투표가 DB unique constraint로 막히는지 검증한다.
 */
import "../lib/bootstrap";
import { query, closePool } from "../../src/server/db";
import { submitVote } from "../../src/server/services/vote";
import { hashCode } from "../../src/server/crypto/code-hash";
import { check, finish, makeTestElection } from "./lib/util";

async function main() {
  console.log("[Harness 4] Double Vote");

  const { election, candidateIds, codes } = await makeTestElection({
    title: "중복투표 하네스",
    voterCount: 2,
    resultVisibleAt: new Date(Date.now() + 86400_000),
  });
  const codeHash = hashCode(codes[0]);

  // 1. 첫 번째 투표 성공
  const first = await submitVote({
    electionId: election.id,
    codeHash,
    candidateId: candidateIds[0],
  });
  check("첫 번째 투표 성공", first.ok);

  // 2~3. 같은 코드 두 번째 투표 → unique constraint로 실패
  const second = await submitVote({
    electionId: election.id,
    codeHash,
    candidateId: candidateIds[1],
  });
  check(
    "두 번째 투표 차단 (already_voted)",
    !second.ok && second.reason === "already_voted",
  );
  check(
    "차단 메시지: 이미 투표가 완료된 코드입니다.",
    !second.ok && second.message === "이미 투표가 완료된 코드입니다.",
  );

  // 4. ballots row가 1개만 존재
  const { rows } = await query<{ count: string }>(
    "select count(*) as count from ballots where election_id = $1",
    [election.id],
  );
  check("ballot은 정확히 1개", rows[0].count === "1");

  finish("Harness 4");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

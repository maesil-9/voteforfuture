/**
 * Harness 4: Double Vote Harness
 * 같은 이름의 두 번째 투표가 DB unique index로 막히고,
 * 무효 처리 후에만 재투표가 가능한지 검증한다.
 */
import "../lib/bootstrap";
import { query, closePool } from "../../src/server/db";
import { submitVote } from "../../src/server/services/vote";
import { approveSubmission, rejectSubmission } from "../../src/server/services/review";
import { check, finish, makeTestAdmin, makeTestElection } from "./lib/util";

async function main() {
  console.log("[Harness 4] Double Vote");

  const { election, candidateIds } = await makeTestElection({
    title: "중복투표 하네스",
    resultVisibleAt: new Date(Date.now() + 86400_000),
  });
  const adminId = await makeTestAdmin("double-harness@calmvote.local");
  const voterName = "중복테스터";

  // 1. 첫 번째 투표 성공
  const first = await submitVote({
    electionId: election.id,
    voterName,
    candidateId: candidateIds[0],
  });
  check("첫 번째 투표 성공", first.ok);
  if (!first.ok) throw new Error("중단");

  // 2~3. 같은 이름(공백/대소문자 변형 포함) 두 번째 투표 → 차단
  const second = await submitVote({
    electionId: election.id,
    voterName: ` ${voterName}  `,
    candidateId: candidateIds[1],
  });
  check("두 번째 투표 차단 (duplicate)", !second.ok && second.reason === "duplicate");

  // 4. 승인 후에도 같은 이름 재투표 차단
  await approveSubmission(first.submissionId, adminId);
  const afterApprove = await submitVote({
    electionId: election.id,
    voterName,
    candidateId: candidateIds[1],
  });
  check(
    "승인 후에도 같은 이름 재투표 차단",
    !afterApprove.ok && afterApprove.reason === "duplicate",
  );

  // 5. ballots row가 1개만 존재
  const { rows } = await query<{ count: string }>(
    "select count(*) as count from ballots where election_id = $1",
    [election.id],
  );
  check("ballot은 정확히 1개", rows[0].count === "1");

  // 6. 별도 사례: 무효 처리된 이름은 재투표 가능
  const troll = await submitVote({
    electionId: election.id,
    voterName: "오타낸사람",
    candidateId: candidateIds[0],
  });
  if (!troll.ok) throw new Error("중단");
  await rejectSubmission(troll.submissionId, adminId, "잘못 입력");
  const retry = await submitVote({
    electionId: election.id,
    voterName: "오타낸사람",
    candidateId: candidateIds[1],
  });
  check("무효 처리 후 같은 이름 재투표 가능", retry.ok);

  finish("Harness 4");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

/**
 * Harness 3: Privacy Harness
 * 투표·검수 후 DB 어디에도 "누가 무엇을 찍었는지"가 남지 않는지 검증한다.
 */
import "../lib/bootstrap";
import fs from "node:fs";
import path from "node:path";
import { query, closePool } from "../../src/server/db";
import { submitVote, verifyVoterName } from "../../src/server/services/vote";
import { approveSubmission } from "../../src/server/services/review";
import { aggregateResults } from "../../src/server/services/results";
import { getElection } from "../../src/server/sql/elections";
import { ResultsSealedError } from "../../src/server/crypto/ballot-sealing";
import {
  check,
  finish,
  makeTestAdmin,
  makeTestElection,
  columnNames,
  revealResults,
} from "./lib/util";
import { projectRoot } from "../lib/bootstrap";

async function main() {
  console.log("[Harness 3] Privacy");

  const { election, candidateIds } = await makeTestElection({
    title: "프라이버시 하네스",
    resultVisibleAt: new Date(Date.now() + 86400_000), // 내일 — 봉인 상태
  });
  const adminId = await makeTestAdmin("privacy-harness@calmvote.local");
  const voterName = "프라이버시테스터";

  // 1~2. 이름으로 입장 + 후보 A에게 투표
  const entry = await verifyVoterName(election.id, voterName, "harness-ip");
  check("이름으로 입장 성공", entry.ok);

  const secretMessage = "방장님 화이팅입니다";
  const result = await submitVote({
    electionId: election.id,
    voterName,
    candidateId: candidateIds[0],
    message: secretMessage,
  });
  check("투표 제출 성공 (메시지 포함)", result.ok);
  if (!result.ok) throw new Error("제출 실패로 중단");

  // 3. 검수 전: 제출 레코드의 봉인값에 평문 후보 id가 없는지
  const { rows: pendingRows } = await query<{
    sealed_choice: string | null;
    iv: string | null;
    auth_tag: string | null;
  }>(
    "select sealed_choice, iv, auth_tag from vote_submissions where id = $1",
    [result.submissionId],
  );
  const pendingBlob = JSON.stringify(pendingRows);
  check("검수 전 봉인값 존재", pendingRows[0].sealed_choice !== null);
  check(
    "검수 전 봉인값에 평문 후보 id 미포함",
    !pendingBlob.includes(candidateIds[0]) && !pendingBlob.includes(candidateIds[1]),
  );
  check("검수 전 메시지 평문 미노출", !pendingBlob.includes(secretMessage));

  // 4. 승인 → 익명 투표함 이동 + 연결 파기
  const approval = await approveSubmission(result.submissionId, adminId);
  check("승인 처리 성공", approval.ok);

  const { rows: afterRows } = await query<{
    sealed_choice: string | null;
    status: string;
  }>("select sealed_choice, status from vote_submissions where id = $1", [
    result.submissionId,
  ]);
  check("승인 후 제출 레코드에서 봉인값 파기", afterRows[0].sealed_choice === null);

  // 5. ballots에는 이름/제출 연결 컬럼 자체가 없다
  const ballotCols = await columnNames("ballots");
  check(
    "ballots 테이블에 voter/name/submission 컬럼 없음",
    !ballotCols.some((c) => /voter|name|submission/.test(c)),
  );
  const { rows: ballots } = await query<{
    encrypted_choice: string;
    iv: string;
    auth_tag: string;
  }>("select encrypted_choice, iv, auth_tag from ballots where election_id = $1", [
    election.id,
  ]);
  check("익명 투표함에 ballot 1건 존재", ballots.length === 1);
  const ballotBlob = JSON.stringify(ballots);
  check("ballot 값에 유권자 이름 미포함", !ballotBlob.includes(voterName));
  check(
    "ballot 값에 평문 후보 id 미포함",
    !ballotBlob.includes(candidateIds[0]) && !ballotBlob.includes(candidateIds[1]),
  );

  // 6~7. 결과 발표 전 집계 시도 → 반드시 실패
  let sealedBlocked = false;
  try {
    await aggregateResults(election);
  } catch (e) {
    sealedBlocked = e instanceof ResultsSealedError;
  }
  check("결과 발표 전 admin 집계 차단 (ResultsSealedError)", sealedBlocked);

  // 7-보강: 서버 코드에 ballots를 평문 기준으로 집계하는 SQL이 없는지 정적 검사
  const sqlDir = path.join(projectRoot, "src", "server");
  const offending: string[] = [];
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f.name)) {
        const src = fs.readFileSync(p, "utf8");
        if (/from\s+ballots[\s\S]{0,200}?(group\s+by|join\s+candidates)/i.test(src)) {
          offending.push(p);
        }
      }
    }
  };
  walk(sqlDir);
  check(
    "후보별 count를 내는 SQL 경로 부재 (정적 검사)",
    offending.length === 0,
    offending.join(", "),
  );

  // 8. 결과 발표일 이후에만 복호화 집계 가능
  await revealResults(election.id);
  const revealed = await getElection(election.id);
  if (!revealed) throw new Error("선거 조회 실패");
  const results = await aggregateResults(revealed);
  const a = results.perCandidate.find((c) => c.candidateId === candidateIds[0]);
  check("발표 이후 복호화 집계 정상 (후보A 1표)", a?.votes === 1);
  check("총 개표 수 일치", results.totalBallots === 1);
  check(
    "발표 이후 익명 메시지 열람 가능",
    results.messages.length === 1 && results.messages[0] === secretMessage,
  );

  finish("Harness 3");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

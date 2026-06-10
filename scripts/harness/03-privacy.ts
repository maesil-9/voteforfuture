/**
 * Harness 3: Privacy Harness
 * 투표 후 DB 어디에도 "누가 무엇을 찍었는지"가 남지 않는지 검증한다.
 */
import "../lib/bootstrap";
import fs from "node:fs";
import path from "node:path";
import { query, closePool } from "../../src/server/db";
import { submitVote, verifyVoterCode } from "../../src/server/services/vote";
import { aggregateResults } from "../../src/server/services/results";
import { getElection } from "../../src/server/sql/elections";
import { ResultsSealedError } from "../../src/server/crypto/ballot-sealing";
import { check, finish, makeTestElection, columnNames, revealResults } from "./lib/util";
import { projectRoot } from "../lib/bootstrap";

async function main() {
  console.log("[Harness 3] Privacy");

  const { election, candidateIds, codes, codeHashes } = await makeTestElection({
    title: "프라이버시 하네스",
    voterCount: 3,
    resultVisibleAt: new Date(Date.now() + 86400_000), // 내일 — 봉인 상태
  });

  // 1~2. 코드 검증 + 후보 A에게 투표
  const entry = await verifyVoterCode(election.id, codes[0], "harness-ip");
  check("유효한 코드로 입장 성공", entry.ok);
  if (!entry.ok) throw new Error("코드 검증 실패로 중단");

  const result = await submitVote({
    electionId: election.id,
    codeHash: entry.codeHash,
    candidateId: candidateIds[0],
  });
  check("투표 제출 성공", result.ok);

  // 3. ballots에 code_hash가 없는지 (컬럼 자체 + 값 모두)
  const ballotCols = await columnNames("ballots");
  check(
    "ballots 테이블에 code/voter/credential 컬럼 없음",
    !ballotCols.some((c) => /voter|code|credential/.test(c)),
  );
  const { rows: ballots } = await query<{
    encrypted_choice: string;
    iv: string;
    auth_tag: string;
  }>("select encrypted_choice, iv, auth_tag from ballots where election_id = $1", [
    election.id,
  ]);
  check("ballot 1건 존재", ballots.length === 1);
  const ballotBlob = JSON.stringify(ballots);
  check(
    "ballot 값 어디에도 code hash 미포함",
    codeHashes.every((h) => !ballotBlob.includes(h)),
  );

  // 4. used_credentials에는 code_hash만 있고 candidate 정보가 없는지
  const usedCols = await columnNames("used_credentials");
  check(
    "used_credentials에 candidate/choice 컬럼 없음",
    !usedCols.some((c) => /candidate|choice|ballot/.test(c)),
  );

  // 5. ballots에 plaintext candidate_id가 없는지
  check(
    "ballot에 평문 candidate id 미포함",
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
        // ballots를 후보별로 group/join하는 쿼리가 존재하면 안 된다
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
  check("총 투표수 일치", results.totalBallots === 1);

  finish("Harness 3");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

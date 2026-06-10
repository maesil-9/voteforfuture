/**
 * Harness 2: Demo Seed Harness
 * 시드 스크립트 실행 후 데이터가 올바르게 생성됐는지 검증한다.
 */
import "../lib/bootstrap";
import { execSync } from "node:child_process";
import { query, closePool } from "../../src/server/db";
import { check, finish, resetAndMigrate } from "./lib/util";

async function main() {
  console.log("[Harness 2] Demo Seed");
  resetAndMigrate();
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });

  const count = async (sql: string) =>
    Number((await query<{ count: string }>(sql)).rows[0].count);

  check("선거 1개 생성", (await count("select count(*) as count from elections")) === 1);
  check("후보 3명 생성", (await count("select count(*) as count from candidates")) === 3);
  check(
    "후보별 정책 3개 이상 (총 9개 이상)",
    (await count("select count(*) as count from candidate_policies")) >= 9,
  );
  check(
    "후보별 포스터 생성",
    (await count("select count(*) as count from candidate_posters")) === 3,
  );
  check("관리자 1명 생성", (await count("select count(*) as count from admins")) === 1);

  check(
    "데모 투표 7건 접수",
    (await count("select count(*) as count from vote_submissions")) === 7,
  );
  check(
    "5건 승인",
    (await count(
      "select count(*) as count from vote_submissions where status = 'approved'",
    )) === 5,
  );
  check(
    "2건 검수 대기",
    (await count(
      "select count(*) as count from vote_submissions where status = 'pending'",
    )) === 2,
  );
  check(
    "승인된 표 수만큼 익명 투표함에 존재",
    (await count("select count(*) as count from ballots")) === 5,
  );
  check(
    "승인된 제출에는 봉인값이 남아있지 않음",
    (await count(
      "select count(*) as count from vote_submissions where status = 'approved' and sealed_choice is not null",
    )) === 0,
  );

  finish("Harness 2");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

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
  check(
    "유권자 코드 30개 발급",
    (await count("select count(*) as count from voter_credentials")) === 30,
  );
  check("관리자 1명 생성", (await count("select count(*) as count from admins")) === 1);

  // 시드도 코드 원문을 저장하지 않는지 — 64자리 hex(HMAC)만 저장
  const { rows } = await query<{ code_hash: string }>(
    "select code_hash from voter_credentials limit 5",
  );
  check(
    "code_hash는 HMAC hex 형식 (원문 아님)",
    rows.every((r) => /^[0-9a-f]{64}$/.test(r.code_hash)),
  );

  finish("Harness 2");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

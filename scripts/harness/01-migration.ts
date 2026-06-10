/**
 * Harness 1: DB Migration Harness
 * 빈 DB에 마이그레이션을 적용하고 테이블/제약/인덱스를 검증한다.
 */
import "../lib/bootstrap";
import { query, closePool, isUniqueViolation } from "../../src/server/db";
import { check, finish, resetAndMigrate, columnNames } from "./lib/util";

async function main() {
  console.log("[Harness 1] DB Migration");
  resetAndMigrate();

  // 테이블 존재 확인
  const { rows } = await query<{ table_name: string }>(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`,
  );
  const tables = rows.map((r) => r.table_name);
  for (const t of [
    "admins",
    "elections",
    "candidates",
    "candidate_posters",
    "candidate_policies",
    "voter_batches",
    "voter_credentials",
    "used_credentials",
    "ballots",
    "audit_logs",
    "code_entry_attempts",
  ]) {
    check(`테이블 ${t} 존재`, tables.includes(t));
  }

  // 비밀투표 핵심: ballots / used_credentials에 유권자 연결 컬럼이 없어야 한다
  const ballotCols = await columnNames("ballots");
  check(
    "ballots에 voter/code/credential 컬럼 없음",
    !ballotCols.some((c) => /voter|code|credential|candidate/.test(c)),
    `columns: ${ballotCols.join(", ")}`,
  );
  const usedCols = await columnNames("used_credentials");
  check(
    "used_credentials에 candidate 컬럼 없음",
    !usedCols.some((c) => /candidate|choice|ballot/.test(c)),
    `columns: ${usedCols.join(", ")}`,
  );

  // fixture
  const { rows: elections } = await query<{ id: string }>(
    `insert into elections (title, status, starts_at, ends_at, result_visible_at)
     values ('제약 테스트', 'draft', now(), now() + interval '1 day', now() + interval '2 day')
     returning id`,
  );
  const electionId = elections[0].id;

  // unique(election_id, code_hash)
  await query(
    "insert into voter_credentials (election_id, code_hash) values ($1, 'dup-hash')",
    [electionId],
  );
  let uniqueBlocked = false;
  try {
    await query(
      "insert into voter_credentials (election_id, code_hash) values ($1, 'dup-hash')",
      [electionId],
    );
  } catch (e) {
    uniqueBlocked = isUniqueViolation(e);
  }
  check("voter_credentials unique(election_id, code_hash) 작동", uniqueBlocked);

  // used_credentials PK
  await query(
    "insert into used_credentials (election_id, code_hash) values ($1, 'used-hash')",
    [electionId],
  );
  let pkBlocked = false;
  try {
    await query(
      "insert into used_credentials (election_id, code_hash) values ($1, 'used-hash')",
      [electionId],
    );
  } catch (e) {
    pkBlocked = isUniqueViolation(e);
  }
  check("used_credentials primary key 작동", pkBlocked);

  // candidate 종속 + cascade
  const { rows: cands } = await query<{ id: string }>(
    `insert into candidates (election_id, name) values ($1, '계단테스트')
     returning id`,
    [electionId],
  );
  const candidateId = cands[0].id;
  await query(
    `insert into candidate_policies (candidate_id, title, body) values ($1, 'p', 'b')`,
    [candidateId],
  );
  await query(
    `insert into candidate_posters (candidate_id, file_name, mime_type, size_bytes, data)
     values ($1, 'f.png', 'image/png', 4, '\\x00010203')`,
    [candidateId],
  );
  await query("delete from candidates where id = $1", [candidateId]);
  const { rows: orphanPolicies } = await query<{ count: string }>(
    "select count(*) as count from candidate_policies where candidate_id = $1",
    [candidateId],
  );
  const { rows: orphanPosters } = await query<{ count: string }>(
    "select count(*) as count from candidate_posters where candidate_id = $1",
    [candidateId],
  );
  check("후보 삭제 시 정책 cascade delete", orphanPolicies[0].count === "0");
  check("후보 삭제 시 포스터 cascade delete", orphanPosters[0].count === "0");

  // election cascade
  await query("delete from elections where id = $1", [electionId]);
  const { rows: orphanCreds } = await query<{ count: string }>(
    "select count(*) as count from voter_credentials where election_id = $1",
    [electionId],
  );
  check("선거 삭제 시 크레덴셜 cascade delete", orphanCreds[0].count === "0");

  // 포스터 3MB 제한 (DB check constraint)
  let sizeBlocked = false;
  try {
    await query(
      `insert into candidate_posters (candidate_id, file_name, mime_type, size_bytes, data)
       values (gen_random_uuid(), 'big.png', 'image/png', ${4 * 1024 * 1024}, '\\x00')`,
    );
  } catch {
    sizeBlocked = true;
  }
  check("포스터 3MB 초과 차단 (check constraint)", sizeBlocked);

  finish("Harness 1");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

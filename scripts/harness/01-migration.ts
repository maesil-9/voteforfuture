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
    "vote_submissions",
    "ballots",
    "audit_logs",
    "entry_attempts",
    "og_images",
  ]) {
    check(`테이블 ${t} 존재`, tables.includes(t));
  }
  for (const dropped of ["voter_credentials", "used_credentials", "voter_batches"]) {
    check(`구 테이블 ${dropped} 제거됨`, !tables.includes(dropped));
  }

  // 비밀투표 핵심: ballots에 유권자/이름 연결 컬럼이 없어야 한다
  const ballotCols = await columnNames("ballots");
  check(
    "ballots에 voter/name/submission 컬럼 없음",
    !ballotCols.some((c) => /voter|name|submission|candidate/.test(c)),
    `columns: ${ballotCols.join(", ")}`,
  );

  // fixture
  const { rows: elections } = await query<{ id: string }>(
    `insert into elections (title, status, starts_at, ends_at, result_visible_at)
     values ('제약 테스트', 'draft', now(), now() + interval '1 day', now() + interval '2 day')
     returning id`,
  );
  const electionId = elections[0].id;

  // 같은 이름의 활성 제출 중복 차단 (부분 유니크 인덱스)
  await query(
    `insert into vote_submissions (election_id, voter_name, name_normalized, sealed_choice, iv, auth_tag)
     values ($1, '중복이', '중복이', 'x', 'x', 'x')`,
    [electionId],
  );
  let uniqueBlocked = false;
  try {
    await query(
      `insert into vote_submissions (election_id, voter_name, name_normalized, sealed_choice, iv, auth_tag)
       values ($1, '중복이', '중복이', 'y', 'y', 'y')`,
      [electionId],
    );
  } catch (e) {
    uniqueBlocked = isUniqueViolation(e);
  }
  check("같은 이름 활성 제출 중복 차단 (unique index)", uniqueBlocked);

  // 무효 처리 후에는 같은 이름으로 재제출 가능
  await query(
    `update vote_submissions set status = 'rejected', sealed_choice = null, iv = null, auth_tag = null
      where election_id = $1 and name_normalized = '중복이'`,
    [electionId],
  );
  let resubmitOk = true;
  try {
    await query(
      `insert into vote_submissions (election_id, voter_name, name_normalized, sealed_choice, iv, auth_tag)
       values ($1, '중복이', '중복이', 'z', 'z', 'z')`,
      [electionId],
    );
  } catch {
    resubmitOk = false;
  }
  check("무효 처리 후 같은 이름 재제출 가능", resubmitOk);

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
  const { rows: orphanSubmissions } = await query<{ count: string }>(
    "select count(*) as count from vote_submissions where election_id = $1",
    [electionId],
  );
  check("선거 삭제 시 제출 cascade delete", orphanSubmissions[0].count === "0");

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

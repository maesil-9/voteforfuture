/**
 * pnpm db:migrate
 * migrations/*.sql 파일을 파일명 순으로 빈 DB 또는 기존 DB에 적용한다.
 * 적용 이력은 schema_migrations 테이블로 관리한다.
 */
import { projectRoot } from "./lib/bootstrap";
import fs from "node:fs";
import path from "node:path";
import { getPool, closePool } from "../src/server/db";

async function main() {
  const pool = getPool();
  await pool.query(`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const dir = path.join(projectRoot, "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows } = await pool.query<{ name: string }>(
    "select name from schema_migrations",
  );
  const applied = new Set(rows.map((r) => r.name));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip   ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [
        file,
      ]);
      await client.query("commit");
      console.log(`apply  ${file}`);
      count++;
    } catch (err) {
      await client.query("rollback").catch(() => {});
      console.error(`FAILED ${file}`);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(
    count === 0 ? "최신 상태입니다." : `${count}개 마이그레이션 적용 완료.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

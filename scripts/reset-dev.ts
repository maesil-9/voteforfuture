/**
 * pnpm db:reset
 * 개발용: public 스키마를 통째로 비우고 마이그레이션을 다시 적용할 수 있게 한다.
 * production 환경에서는 실행을 거부한다.
 */
import "./lib/bootstrap";
import { getPool, closePool } from "../src/server/db";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("production에서는 db:reset을 실행할 수 없습니다.");
  }
  const pool = getPool();
  await pool.query("drop schema public cascade");
  await pool.query("create schema public");
  console.log("public 스키마를 초기화했습니다. `pnpm db:migrate`를 실행하세요.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

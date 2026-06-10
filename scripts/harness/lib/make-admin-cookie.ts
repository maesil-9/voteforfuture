/** 디버그용: 관리자 세션 쿠키 값을 출력한다 (로컬 전용) */
import "../../lib/bootstrap";
import { query, closePool } from "../../../src/server/db";
import { signPayload } from "../../../src/server/auth/signing";
import { env } from "../../../src/server/env";

async function main() {
  const { rows } = await query<{ id: string; email: string }>(
    "select id, email from admins limit 1",
  );
  if (!rows[0]) throw new Error("관리자 계정이 없습니다.");
  const token = signPayload(
    {
      adminId: rows[0].id,
      email: rows[0].email,
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    env.adminSessionSecret,
  );
  console.log(token);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closePool());

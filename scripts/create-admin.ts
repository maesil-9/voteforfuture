/**
 * pnpm admin:create -- <email> <password>
 * 관리자 계정을 생성(또는 비밀번호 재설정)한다.
 */
import "./lib/bootstrap";
import { createAdmin } from "../src/server/sql/admin";
import { hashPassword } from "../src/server/auth/password";
import { closePool } from "../src/server/db";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.log("사용법: pnpm admin:create -- <email> <password>");
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.log("비밀번호는 8자 이상이어야 합니다.");
    process.exitCode = 1;
    return;
  }
  const id = await createAdmin(email, await hashPassword(password));
  console.log(`관리자 계정 준비 완료: ${email} (id: ${id})`);
  console.log("로그인: http://localhost:3000/admin/login");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

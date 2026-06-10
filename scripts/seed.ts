/**
 * pnpm seed:demo
 * 데모 선거(진행 중) + 후보 3명 + 정책/포스터 + 유권자 코드 30개 + 관리자 1명.
 */
import "./lib/bootstrap";
import { createAdmin } from "../src/server/sql/admin";
import { hashPassword } from "../src/server/auth/password";
import { closePool } from "../src/server/db";
import { createDemoElection } from "./lib/demo-data";

const DEMO_ADMIN_EMAIL = "admin@calmvote.local";
const DEMO_ADMIN_PASSWORD = "calm-vote-demo!1";

async function main() {
  const now = Date.now();
  const hour = 3600_000;

  await createAdmin(DEMO_ADMIN_EMAIL, await hashPassword(DEMO_ADMIN_PASSWORD));

  const { election, codes } = await createDemoElection({
    title: "[침착한 일상 이야기방] 방장 선거",
    status: "open",
    startsAt: new Date(now - 1 * hour),
    endsAt: new Date(now + 72 * hour),
    resultVisibleAt: new Date(now + 96 * hour),
    voterCount: 30,
  });

  console.log("=".repeat(64));
  console.log("데모 시드 완료");
  console.log("=".repeat(64));
  console.log(`선거: ${election.title}`);
  console.log(`  id: ${election.id}`);
  console.log(`  투표 기간: 1시간 전 ~ 3일 후 (현재 open)`);
  console.log(`  결과 발표: 4일 후 (그 전까지 봉인)`);
  console.log("");
  console.log("관리자 로그인 (http://localhost:3000/admin/login)");
  console.log(`  email:    ${DEMO_ADMIN_EMAIL}`);
  console.log(`  password: ${DEMO_ADMIN_PASSWORD}`);
  console.log("");
  console.log("데모 투표 코드 (30개 중 10개 표시 — 재조회 불가):");
  for (const code of codes.slice(0, 10)) {
    console.log(`  ${code}`);
  }
  console.log("");
  console.log("결과 발표일을 당겨서 개표를 보려면:");
  console.log(
    `  docker exec voteforfuture-db psql -U vote -d voteforfuture -c "update elections set result_visible_at = now(), ends_at = now() where id = '${election.id}'"`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

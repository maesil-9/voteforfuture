/**
 * pnpm seed:demo
 * 데모 선거(진행 중) + 후보 3명 + 정책/포스터 + 데모 투표 7건(5건 승인) + 관리자 1명.
 */
import "./lib/bootstrap";
import { createAdmin } from "../src/server/sql/admin";
import { hashPassword } from "../src/server/auth/password";
import { closePool } from "../src/server/db";
import {
  createDemoElection,
  createDemoSubmissions,
  DEMO_VOTERS,
} from "./lib/demo-data";

const DEMO_ADMIN_EMAIL = "admin@calmvote.local";
const DEMO_ADMIN_PASSWORD = "calm-vote-demo!1";

async function main() {
  const now = Date.now();
  const hour = 3600_000;

  const adminId = await createAdmin(
    DEMO_ADMIN_EMAIL,
    await hashPassword(DEMO_ADMIN_PASSWORD),
  );

  const { election, candidateIds } = await createDemoElection({
    title: "[침착한 일상 이야기방] 방장 선거",
    status: "open",
    startsAt: new Date(now - 1 * hour),
    endsAt: new Date(now + 72 * hour),
    resultVisibleAt: new Date(now + 96 * hour),
    expectedVoters: 30,
  });

  const { submitted, approved } = await createDemoSubmissions(
    election.id,
    candidateIds,
    adminId,
  );

  console.log("=".repeat(64));
  console.log("데모 시드 완료");
  console.log("=".repeat(64));
  console.log(`선거: ${election.title}`);
  console.log(`  id: ${election.id}`);
  console.log(`  투표 기간: 1시간 전 ~ 3일 후 (현재 open)`);
  console.log(`  결과 발표: 4일 후 (그 전까지 봉인)`);
  console.log(`  데모 투표: ${submitted}건 접수, ${approved}건 승인, ${submitted - approved}건 검수 대기`);
  console.log("");
  console.log("관리자 로그인 (http://localhost:3000/admin/login)");
  console.log(`  email:    ${DEMO_ADMIN_EMAIL}`);
  console.log(`  password: ${DEMO_ADMIN_PASSWORD}`);
  console.log("");
  console.log("이미 투표한 데모 닉네임 (같은 이름은 재투표 불가):");
  console.log(`  ${DEMO_VOTERS.join(", ")}`);
  console.log("");
  console.log("새 닉네임으로 직접 투표해보세요: http://localhost:3000/vote/enter-name");
  console.log("");
  console.log("결과 발표일을 당겨서 개표를 보려면:");
  console.log(
    `  docker exec voteforfuture-db psql -U vote -d voteforfuture -c "update elections set result_visible_at = now(), ends_at = now(), status = 'closed' where id = '${election.id}'"`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

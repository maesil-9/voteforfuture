/**
 * pnpm harness:all
 * 하네스 1→2→3→4→5→7→6 순서로 실행한다.
 * 주의: 01/02가 DB를 리셋·시드하므로 개발 데이터가 초기화된다.
 */
import { execSync } from "node:child_process";

const HARNESSES = [
  "scripts/harness/01-migration.ts",
  "scripts/harness/02-seed.ts",
  "scripts/harness/03-privacy.ts",
  "scripts/harness/04-double-vote.ts",
  "scripts/harness/05-turnout.ts",
  "scripts/harness/07-result-seal.ts",
  "scripts/harness/06-responsive.ts",
];

let failed = false;
for (const h of HARNESSES) {
  console.log("\n" + "=".repeat(64));
  try {
    execSync(`npx tsx ${h}`, { stdio: "inherit" });
  } catch {
    failed = true;
  }
}

console.log("\n" + "=".repeat(64));
if (failed) {
  console.error("일부 하네스가 실패했습니다.");
  process.exit(1);
}
console.log("모든 하네스 통과.");

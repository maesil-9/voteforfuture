/**
 * 백오피스/사용자 화면 모바일(390x844) 스크린샷 캡처 (검토용, 로컬 전용)
 * 사용: npx tsx scripts/harness/lib/mobile-screenshots.ts <electionId> <adminCookie>
 */
import "../../lib/bootstrap";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

async function main() {
  const [electionId, cookie] = process.argv.slice(2);
  if (!electionId || !cookie) {
    throw new Error("사용법: tsx mobile-screenshots.ts <electionId> <adminCookie>");
  }

  const outDir = path.join(process.cwd(), ".omc", "screenshots");
  fs.mkdirSync(outDir, { recursive: true });

  const executablePath = EDGE_PATHS.find((p) => fs.existsSync(p));
  if (!executablePath) throw new Error("Edge를 찾을 수 없습니다.");

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await browser.setCookie({
    name: "cv_admin",
    value: cookie,
    domain: "localhost",
    path: "/",
    httpOnly: true,
  });

  const targets: [string, string][] = [
    ["admin-dashboard", `/admin`],
    ["admin-election-overview", `/admin/elections/${electionId}`],
    ["admin-candidates", `/admin/elections/${electionId}/candidates`],
    ["admin-review", `/admin/elections/${electionId}/review`],
    ["admin-turnout", `/admin/elections/${electionId}/turnout`],
    ["admin-results", `/admin/elections/${electionId}/results`],
    ["admin-login", `/admin/login`],
    ["voter-landing", `/`],
    ["voter-enter-name", `/vote/enter-name`],
    ["results-page", `/results/${electionId}`],
    ["replay-theater", `/results/${electionId}/replay`],
  ];

  for (const [name, url] of targets) {
    await page.goto(`http://localhost:3100${url}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(outDir, `${name}.png`) as `${string}.png`,
      fullPage: !name.includes("replay"),
    });
    console.log(`captured ${name}`);
  }

  await browser.close();
  console.log(`저장 위치: ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

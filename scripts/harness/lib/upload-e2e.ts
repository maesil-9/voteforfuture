/**
 * 파일 업로드 E2E 검증 (로컬 전용)
 * 실제 브라우저(headless Edge)로 포스터/OG 이미지를 UploadField(프로그레스바)로
 * 업로드하고 DB 저장 + 서빙까지 확인한다. 3MB 초과 클라이언트 거부도 검증.
 * 사용: npx tsx scripts/harness/lib/upload-e2e.ts <adminCookie>
 */
import "../../lib/bootstrap";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer, { type Page } from "puppeteer-core";
import { query, closePool } from "../../../src/server/db";
import { createElection } from "../../../src/server/sql/elections";
import { createCandidate } from "../../../src/server/sql/candidates";

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

// 1x1 빨간 픽셀 PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** 텍스트가 포함된 버튼 클릭 */
async function clickButtonByText(page: Page, text: string) {
  await page.evaluate((t) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const target = buttons.find((b) => b.textContent?.includes(t));
    if (!target) throw new Error(`버튼을 찾을 수 없음: ${t}`);
    (target as HTMLButtonElement).click();
  }, text);
}

/** 특정 텍스트가 화면에 나타날 때까지 대기 */
async function waitForText(page: Page, text: string, timeout = 15000) {
  await page.waitForFunction(
    (t) => document.body.innerText.includes(t),
    { timeout },
    text,
  );
}

async function main() {
  const [cookie] = process.argv.slice(2);
  if (!cookie) throw new Error("사용법: tsx upload-e2e.ts <adminCookie>");

  console.log("[Upload E2E] 파일 업로드 + 프로그레스바 검증");

  // 업로드 가능한(draft) 선거 + 후보 준비
  const now = Date.now();
  const election = await createElection({
    title: "업로드 E2E 테스트",
    description: null,
    status: "draft",
    startsAt: new Date(now + 86400_000),
    endsAt: new Date(now + 2 * 86400_000),
    resultVisibleAt: new Date(now + 3 * 86400_000),
    maxVoters: 0,
  });
  await createCandidate(election.id, {
    name: "업로드후보",
    shortIntro: null,
    profile: null,
    slogan: null,
    colorHint: null,
    displayOrder: 0,
  });

  // 테스트 파일 준비
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "upload-e2e-"));
  const smallPng = path.join(tmp, "poster.png");
  fs.writeFileSync(smallPng, TINY_PNG);
  const bigPng = path.join(tmp, "too-big.png");
  fs.writeFileSync(bigPng, Buffer.concat([TINY_PNG, Buffer.alloc(3 * 1024 * 1024 + 1024)]));

  const executablePath = EDGE_PATHS.find((p) => fs.existsSync(p));
  if (!executablePath) throw new Error("Edge를 찾을 수 없습니다.");
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await browser.setCookie({
      name: "cv_admin",
      value: cookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    });

    const base = "http://localhost:3100";
    const candidatesUrl = `${base}/admin/elections/${election.id}/candidates`;

    // 1) 포스터 정상 업로드 (UploadField → XHR)
    await page.goto(candidatesUrl, { waitUntil: "networkidle0" });
    const posterInput = await page.waitForSelector('input[type="file"]');
    await posterInput!.uploadFile(smallPng);
    await clickButtonByText(page, "포스터 업로드");
    await waitForText(page, "업로드 완료!");
    check("포스터 업로드 완료 메시지 표시", true);

    const { rows: posters } = await query<{ id: string; size_bytes: number; mime_type: string }>(
      `select p.id, p.size_bytes, p.mime_type from candidate_posters p
        join candidates c on c.id = p.candidate_id
       where c.election_id = $1`,
      [election.id],
    );
    check("포스터가 DB(bytea)에 저장됨", posters.length === 1);
    check(
      "저장된 크기/타입 일치",
      posters[0]?.size_bytes === TINY_PNG.length && posters[0]?.mime_type === "image/png",
    );

    const posterRes = await page.goto(`${base}/api/posters/${posters[0].id}`);
    check(
      "업로드한 포스터가 서빙됨 (200 image/png)",
      posterRes!.status() === 200 && posterRes!.headers()["content-type"] === "image/png",
    );

    // 2) 3MB 초과 → 업로드 전에 클라이언트에서 즉시 거부
    await page.goto(candidatesUrl, { waitUntil: "networkidle0" });
    const bigInput = await page.waitForSelector('input[type="file"]');
    await bigInput!.uploadFile(bigPng);
    await waitForText(page, "3MB 이하만 업로드");
    check("3MB 초과 선택 시 즉시 거부 메시지", true);

    // 3) OG 이미지 업로드
    const overviewUrl = `${base}/admin/elections/${election.id}`;
    await page.goto(overviewUrl, { waitUntil: "networkidle0" });
    const ogInput = await page.waitForSelector('input[type="file"]');
    await ogInput!.uploadFile(smallPng);
    await clickButtonByText(page, "업로드");
    await waitForText(page, "업로드 완료!");
    check("OG 이미지 업로드 완료 메시지 표시", true);

    const ogRes = await page.goto(`${base}/api/og-image/${election.id}`);
    check(
      "업로드한 OG 이미지가 서빙됨 (200 image/png)",
      ogRes!.status() === 200 && ogRes!.headers()["content-type"] === "image/png",
    );

    // 4) 미인증 업로드 차단 (쿠키 없는 Node fetch)
    const anonRes = await fetch(
      `${base}/api/admin/elections/${election.id}/og-image`,
      { method: "POST", body: new FormData() },
    );
    check("미인증 업로드 401 차단", anonRes.status === 401, `got ${anonRes.status}`);
  } finally {
    await browser.close();
    await query("delete from elections where id = $1", [election.id]);
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log("");
  if (failures > 0) {
    console.error(`Upload E2E: ${failures}개 실패`);
    process.exitCode = 1;
  } else {
    console.log("Upload E2E: 모든 검증 통과");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closePool());

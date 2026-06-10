/** 결과/상영관 신규 연출 스크린샷 (검토용, 로컬 전용) */
import "../../lib/bootstrap";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

async function main() {
  const [electionId] = process.argv.slice(2);
  if (!electionId) throw new Error("사용법: tsx fun-screenshots.ts <electionId>");

  const outDir = path.join(process.cwd(), ".omc", "screenshots");
  fs.mkdirSync(outDir, { recursive: true });
  const executablePath = EDGE_PATHS.find((p) => fs.existsSync(p))!;
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  const base = "http://localhost:3100";

  // 1) 봉인 해제 인트로 (첫 방문, 0.4초 시점)
  await page.goto(`${base}/results/${electionId}`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, "fun-seal-intro.png") as `${string}.png` });

  // 2) 카운트업 종료 후 결과 (4초 대기)
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(outDir, "fun-results-final.png") as `${string}.png`, fullPage: true });

  // 3) 상영관 엔딩 크레딧 — 마지막에서 두 번째 슬라이드로 점프하기 어렵다.
  //    좌측 탭 대신: 페이지 진입 후 '다음' 영역을 여러 번 눌러 크레딧까지 이동
  await page.goto(`${base}/results/${electionId}/replay`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  for (let i = 0; i < 30; i++) {
    const atCredits = await page.evaluate(() =>
      document.body.innerText.includes("ENDING CREDITS") ||
      document.body.innerText.includes("ending credits") ||
      document.body.innerText.includes("막이 내렸습니다"),
    );
    if (atCredits) break;
    await page.mouse.click(360, 400); // 우측 탭 영역
    await new Promise((r) => setTimeout(r, 350));
  }
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outDir, "fun-credits.png") as `${string}.png` });

  // 4) 박수 버튼 연타 후
  await page.mouse.click(195, 770); // 박수 버튼 근처
  await page.mouse.click(195, 770);
  await page.mouse.click(195, 770);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, "fun-clap.png") as `${string}.png` });

  await browser.close();
  console.log(`저장: ${outDir} (fun-*.png)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

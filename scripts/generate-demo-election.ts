/**
 * pnpm demo:election -- [--upcoming|--open|--closed|--revealed]
 * 상태별 데모 선거를 추가로 생성한다 (UI 상태 확인용).
 */
import "./lib/bootstrap";
import { closePool } from "../src/server/db";
import { createDemoElection } from "./lib/demo-data";

async function main() {
  const mode = (process.argv[2] ?? "--open").replace(/^--/, "");
  const now = Date.now();
  const hour = 3600_000;

  const presets: Record<
    string,
    { startsAt: Date; endsAt: Date; resultVisibleAt: Date; label: string }
  > = {
    upcoming: {
      startsAt: new Date(now + 24 * hour),
      endsAt: new Date(now + 96 * hour),
      resultVisibleAt: new Date(now + 120 * hour),
      label: "투표 예정",
    },
    open: {
      startsAt: new Date(now - 1 * hour),
      endsAt: new Date(now + 72 * hour),
      resultVisibleAt: new Date(now + 96 * hour),
      label: "투표 진행 중",
    },
    closed: {
      startsAt: new Date(now - 72 * hour),
      endsAt: new Date(now - 1 * hour),
      resultVisibleAt: new Date(now + 24 * hour),
      label: "투표 종료 (결과 봉인)",
    },
    revealed: {
      startsAt: new Date(now - 96 * hour),
      endsAt: new Date(now - 24 * hour),
      resultVisibleAt: new Date(now - 1 * hour),
      label: "결과 공개",
    },
  };

  const preset = presets[mode];
  if (!preset) {
    console.log("사용법: pnpm demo:election -- [--upcoming|--open|--closed|--revealed]");
    process.exitCode = 1;
    return;
  }

  const { election, codes } = await createDemoElection({
    title: `[침착한 일상 이야기방] 방장 선거 (데모: ${preset.label})`,
    status: "scheduled",
    startsAt: preset.startsAt,
    endsAt: preset.endsAt,
    resultVisibleAt: preset.resultVisibleAt,
    voterCount: 10,
    batchName: `데모 명부 (${preset.label})`,
  });

  console.log(`생성 완료: ${election.title}`);
  console.log(`  id: ${election.id}`);
  console.log(`  코드 5개: ${codes.slice(0, 5).join(", ")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

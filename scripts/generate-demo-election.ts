/**
 * pnpm demo:election -- [--upcoming|--open|--closed|--revealed]
 * 상태별 데모 선거를 추가로 생성한다 (UI 상태 확인용).
 */
import "./lib/bootstrap";
import { closePool, query } from "../src/server/db";
import { createDemoElection, createDemoSubmissions } from "./lib/demo-data";
import { updateElection } from "../src/server/sql/elections";

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

  // 데모 제출을 위해 일단 open 상태로 만들고, 제출 후 원하는 일정으로 되돌린다
  const needsSubmissions = mode !== "upcoming";
  const { election, candidateIds } = await createDemoElection({
    title: `[침착한 일상 이야기방] 방장 선거 (데모: ${preset.label})`,
    status: "scheduled",
    startsAt: needsSubmissions ? new Date(now - 1 * hour) : preset.startsAt,
    endsAt: needsSubmissions ? new Date(now + 1 * hour) : preset.endsAt,
    resultVisibleAt: needsSubmissions
      ? new Date(now + 2 * hour)
      : preset.resultVisibleAt,
    expectedVoters: 10,
  });

  if (needsSubmissions) {
    const { rows } = await query<{ id: string }>("select id from admins limit 1");
    if (!rows[0]) {
      throw new Error("관리자 계정이 없습니다. 먼저 pnpm seed:demo 또는 admin:create를 실행하세요.");
    }
    await createDemoSubmissions(election.id, candidateIds, rows[0].id, 5);

    await updateElection(election.id, {
      title: election.title,
      description: election.description,
      status: "scheduled",
      startsAt: preset.startsAt,
      endsAt: preset.endsAt,
      resultVisibleAt: preset.resultVisibleAt,
      maxVoters: election.maxVoters,
    });
  }

  console.log(`생성 완료: ${election.title}`);
  console.log(`  id: ${election.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());

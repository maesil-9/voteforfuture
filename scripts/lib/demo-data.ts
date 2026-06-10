/**
 * 데모 선거 데이터 생성 공용 로직 (seed.ts / generate-demo-election.ts 공유)
 */
import { createElection } from "../../src/server/sql/elections";
import {
  createCandidate,
  createPolicy,
  setPoster,
} from "../../src/server/sql/candidates";
import { submitVote } from "../../src/server/services/vote";
import { approveSubmission } from "../../src/server/services/review";
import { listSubmissions } from "../../src/server/sql/submissions";
import type { Election, ElectionStatus } from "../../src/server/types";

export const DEMO_CANDIDATES = [
  {
    name: "침착한곰",
    slogan: "조용한 방, 단단한 운영",
    shortIntro: "방 개설 멤버. 3년째 새벽 정적을 지키는 사람.",
    colorHint: "#34506B",
    profile:
      "2023년 방 개설 때부터 함께한 터줏대감입니다.\n분쟁이 생기면 먼저 듣고, 늦게 판단합니다.\n공지는 짧게, 규칙은 적게가 철학입니다.",
    policies: [
      {
        title: "도배·광고 무관용, 그 외엔 최대한 관대",
        body: "광고 계정은 즉시 차단하되, 일상 대화에는 운영 개입을 최소화합니다.",
      },
      {
        title: "월 1회 익명 건의함 운영",
        body: "구글폼 익명 건의함을 매월 마지막 주에 열고, 결과를 요약 공지합니다.",
      },
      {
        title: "새벽 시간대 부방장 1명 지정",
        body: "새벽(00~07시) 활동 멤버 중 부방장을 두어 운영 공백을 없앱니다.",
      },
    ],
  },
  {
    name: "조용한달팽이",
    slogan: "느려도 빠짐없이, 모두의 이야기",
    shortIntro: "눈팅러도 편한 방을 만들고 싶은 5년차 직장인.",
    colorHint: "#5A7D5A",
    profile:
      "말수는 적지만 모든 대화를 읽는 사람입니다.\n조용한 멤버가 소외되지 않는 방을 만들고 싶습니다.\n갈등 중재 경험: 사내 노사협의회 간사 2년.",
    policies: [
      {
        title: "주간 '조용한 안부' 스레드",
        body: "매주 월요일, 부담 없이 이모지 하나로만 안부를 남기는 스레드를 엽니다.",
      },
      {
        title: "강퇴 전 3단계 절차 명문화",
        body: "경고 → 1일 발언 제한 → 강퇴의 3단계 절차를 공지로 못박아 자의적 운영을 막습니다.",
      },
      {
        title: "분기별 방 규칙 리뷰 투표",
        body: "분기마다 규칙 유지/수정 여부를 전체 투표로 결정합니다.",
      },
    ],
  },
  {
    name: "새벽커피",
    slogan: "활기는 더하고, 피로는 빼고",
    shortIntro: "이벤트 기획이 취미인 방 분위기 메이커.",
    colorHint: "#A87A24",
    profile:
      "방이 조금 더 살아있길 바라는 사람입니다.\n다만 활기가 소음이 되지 않도록 '조용한 이벤트'를 지향합니다.\n전직 동아리 회장, 현직 마케터.",
    policies: [
      {
        title: "월간 사진 한 장 공유전",
        body: "한 달에 한 번, '오늘의 하늘' 같은 주제로 사진 한 장만 올리는 이벤트를 엽니다.",
      },
      {
        title: "알림 피로 줄이기 — 공지 주 1회 원칙",
        body: "전체 알림이 가는 공지는 주 1회로 모아서 발송합니다.",
      },
      {
        title: "신규 멤버 환영 가이드 자동화",
        body: "입장 시 환영 안내문 + 방 규칙 요약을 고정 메시지로 정리해 둡니다.",
      },
    ],
  },
];

/** 데모 투표자 명단 (앞 5명은 승인, 나머지는 검수 대기 상태로 남긴다) */
export const DEMO_VOTER_ENTRIES: { name: string; message?: string }[] = [
  { name: "민트초코", message: "누가 되든 우리 방 평화롭게 부탁해요" },
  { name: "야근하는라쿤", message: "새벽 시간대도 챙겨주세요!" },
  { name: "햇살한스푼" },
  { name: "고요한새벽", message: "공지는 적게, 웃음은 많게" },
  { name: "감자전" },
  { name: "지나가던행인", message: "다들 한 표 행사합시다" },
  { name: "츤데레토끼" },
];

export const DEMO_VOTERS = DEMO_VOTER_ENTRIES.map((v) => v.name);

function posterSvg(name: string, slogan: string, color: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="${color}"/>
  <rect x="24" y="24" width="552" height="752" fill="none" stroke="#FBF8F1" stroke-width="3" stroke-dasharray="2 8"/>
  <text x="48" y="96" font-family="serif" font-size="28" fill="#FBF8F1" opacity="0.85">[침착한 일상 이야기방]</text>
  <text x="48" y="430" font-family="serif" font-size="88" font-weight="900" fill="#FBF8F1">${name}</text>
  <text x="48" y="500" font-family="serif" font-size="34" fill="#FBF8F1" opacity="0.92">“${slogan}”</text>
  <text x="48" y="730" font-family="sans-serif" font-size="22" fill="#FBF8F1" opacity="0.7">방장 선거 공식 포스터</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

export async function createDemoElection(opts: {
  title: string;
  status: ElectionStatus;
  startsAt: Date;
  endsAt: Date;
  resultVisibleAt: Date;
  expectedVoters: number;
}): Promise<{ election: Election; candidateIds: string[] }> {
  const election = await createElection({
    title: opts.title,
    description:
      "우리 방의 다음 방장을 뽑는 선거입니다. 한 표 한 표는 익명으로 봉인되며, 결과 발표 전에는 누구도 개표할 수 없습니다.",
    status: opts.status,
    startsAt: opts.startsAt,
    endsAt: opts.endsAt,
    resultVisibleAt: opts.resultVisibleAt,
    maxVoters: opts.expectedVoters,
  });

  const candidateIds: string[] = [];
  for (let i = 0; i < DEMO_CANDIDATES.length; i++) {
    const c = DEMO_CANDIDATES[i];
    const candidateId = await createCandidate(election.id, {
      name: c.name,
      slogan: c.slogan,
      shortIntro: c.shortIntro,
      profile: c.profile,
      colorHint: c.colorHint,
      displayOrder: i,
    });
    candidateIds.push(candidateId);
    for (let j = 0; j < c.policies.length; j++) {
      await createPolicy(candidateId, {
        title: c.policies[j].title,
        body: c.policies[j].body,
        displayOrder: j,
      });
    }
    const svg = posterSvg(c.name, c.slogan, c.colorHint);
    await setPoster(candidateId, {
      fileName: `${c.name}-poster.svg`,
      mimeType: "image/svg+xml",
      sizeBytes: svg.length,
      data: svg,
    });
  }

  return { election, candidateIds };
}

/**
 * 데모 투표 제출 + 일부 승인.
 * 투표가 open 상태인 선거에서만 동작한다.
 */
export async function createDemoSubmissions(
  electionId: string,
  candidateIds: string[],
  adminId: string,
  approveCount = 5,
): Promise<{ submitted: number; approved: number }> {
  for (let i = 0; i < DEMO_VOTER_ENTRIES.length; i++) {
    const entry = DEMO_VOTER_ENTRIES[i];
    const result = await submitVote({
      electionId,
      voterName: entry.name,
      candidateId: candidateIds[i % candidateIds.length],
      message: entry.message,
    });
    if (!result.ok) {
      throw new Error(`데모 투표 실패 (${entry.name}): ${result.message}`);
    }
  }

  const submissions = await listSubmissions(electionId);
  const pending = submissions
    .filter((s) => s.status === "pending")
    .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());

  let approved = 0;
  for (const s of pending.slice(0, approveCount)) {
    const r = await approveSubmission(s.id, adminId);
    if (r.ok) approved++;
  }

  return { submitted: DEMO_VOTER_ENTRIES.length, approved };
}

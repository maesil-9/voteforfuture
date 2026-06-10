import crypto from "node:crypto";
import { isUniqueViolation, query } from "../db";
import { sealChoice } from "../crypto/ballot-sealing";
import { assertVotingOpen, getElectionPhase } from "../guards/election-state";
import { getElection } from "../sql/elections";
import { getCandidate } from "../sql/candidates";
import { hasActiveSubmission, insertSubmission } from "../sql/submissions";

/**
 * 투표 서비스 (이름 기반).
 *
 * - 유권자는 이름(닉네임)을 입력하고 투표한다.
 * - 제출 시 선택값은 즉시 AES-256-GCM으로 봉인되어 vote_submissions에
 *   임시 보관된다. 앱은 이 값을 복호화할 수 없다 (개표 가드와 동일).
 * - 같은 이름의 활성 제출은 부분 유니크 인덱스가 DB 레벨에서 차단한다.
 * - 검수(승인/무효)는 review service가 담당하며, 승인 시 이름-표 연결이
 *   파기된 채 익명 투표함으로 이동한다.
 */

const FRIENDLY = {
  emptyName: "이름(닉네임)을 입력해주세요.",
  nameTooLong: "이름은 30자 이내로 입력해주세요.",
  duplicate:
    "이미 같은 이름으로 투표가 접수되었습니다. 본인이 투표한 적이 없다면 방장에게 알려주세요 — 검수에서 무효 처리 후 다시 투표할 수 있습니다.",
  notOpenUpcoming: "아직 투표가 시작되지 않았습니다.",
  notOpenClosed: "투표가 종료되었습니다.",
  rateLimited: "시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
  invalidCandidate: "이 후보는 현재 투표할 수 없습니다.",
  generic: "투표 처리 중 문제가 발생했습니다. 다시 시도해주세요.",
};

// ---------- 가벼운 rate limit (DB 기반) ----------

const MAX_FAILURES_PER_WINDOW = 15;
const WINDOW_MINUTES = 5;

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

async function isRateLimited(ipHash: string): Promise<boolean> {
  const { rows } = await query<{ count: string }>(
    `select count(*) as count from entry_attempts
      where ip_hash = $1 and succeeded = false
        and attempted_at > now() - interval '${WINDOW_MINUTES} minutes'`,
    [ipHash],
  );
  return Number(rows[0].count) >= MAX_FAILURES_PER_WINDOW;
}

async function recordAttempt(ipHash: string, succeeded: boolean) {
  await query(
    "insert into entry_attempts (ip_hash, succeeded) values ($1, $2)",
    [ipHash, succeeded],
  );
}

// ---------- 이름 입장 검증 ----------

export type NameCheckResult =
  | { ok: true; voterName: string }
  | {
      ok: false;
      reason: "invalid" | "duplicate" | "not_open" | "rate_limited";
      message: string;
    };

export async function verifyVoterName(
  electionId: string,
  rawName: string,
  clientIp: string,
): Promise<NameCheckResult> {
  const ipHash = hashIp(clientIp);
  if (await isRateLimited(ipHash)) {
    return { ok: false, reason: "rate_limited", message: FRIENDLY.rateLimited };
  }

  const voterName = rawName.trim().replace(/\s+/g, " ");
  if (!voterName) {
    return { ok: false, reason: "invalid", message: FRIENDLY.emptyName };
  }
  if (voterName.length > 30) {
    return { ok: false, reason: "invalid", message: FRIENDLY.nameTooLong };
  }

  const election = await getElection(electionId);
  if (!election) {
    await recordAttempt(ipHash, false);
    return { ok: false, reason: "invalid", message: FRIENDLY.generic };
  }

  const phase = getElectionPhase(election);
  if (phase !== "open") {
    return {
      ok: false,
      reason: "not_open",
      message:
        phase === "upcoming" ? FRIENDLY.notOpenUpcoming : FRIENDLY.notOpenClosed,
    };
  }

  if (await hasActiveSubmission(electionId, voterName)) {
    await recordAttempt(ipHash, false);
    return { ok: false, reason: "duplicate", message: FRIENDLY.duplicate };
  }

  await recordAttempt(ipHash, true);
  return { ok: true, voterName };
}

// ---------- 투표 제출 ----------

export type SubmitVoteResult =
  | { ok: true; submissionId: string }
  | {
      ok: false;
      reason: "duplicate" | "invalid_name" | "invalid_candidate" | "not_open";
      message: string;
    };

export async function submitVote(params: {
  electionId: string;
  voterName: string;
  candidateId: string;
  /** 투표와 함께 남기는 한 마디 (선택, 50자) */
  message?: string;
}): Promise<SubmitVoteResult> {
  const { electionId, candidateId } = params;
  const voterName = params.voterName.trim().replace(/\s+/g, " ");
  const voterMessage = params.message?.trim().slice(0, 50) || undefined;

  if (!voterName || voterName.length > 30) {
    return { ok: false, reason: "invalid_name", message: FRIENDLY.emptyName };
  }

  const election = await getElection(electionId);
  if (!election) {
    return { ok: false, reason: "invalid_name", message: FRIENDLY.generic };
  }

  const candidate = await getCandidate(candidateId);
  if (!candidate || candidate.electionId !== electionId) {
    return {
      ok: false,
      reason: "invalid_candidate",
      message: FRIENDLY.invalidCandidate,
    };
  }

  try {
    // 제출 시점 기준 투표 기간 재검증
    assertVotingOpen(election);

    // 선택값(+메시지)을 즉시 봉인 — 이후 어떤 화면/로그에도 평문이 존재하지 않는다.
    // 같은 이름의 활성 제출은 부분 유니크 인덱스가 차단한다.
    const sealed = sealChoice({
      electionId,
      candidateId,
      message: voterMessage,
    });
    const submissionId = await insertSubmission(
      electionId,
      voterName,
      sealed,
      voterMessage !== undefined,
    );
    return { ok: true, submissionId };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, reason: "duplicate", message: FRIENDLY.duplicate };
    }
    if (err instanceof Error && err.name === "VotingNotOpenError") {
      return { ok: false, reason: "not_open", message: err.message };
    }
    console.error("[vote] submit failed:", err);
    return { ok: false, reason: "invalid_name", message: FRIENDLY.generic };
  }
}

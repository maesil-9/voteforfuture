import crypto from "node:crypto";
import { isUniqueViolation, query, withTransaction } from "../db";
import { hashCode } from "../crypto/code-hash";
import { sealChoice } from "../crypto/ballot-sealing";
import { assertVotingOpen, getElectionPhase } from "../guards/election-state";
import { getElection } from "../sql/elections";
import { getCandidate } from "../sql/candidates";
import { checkCredentialStatus, findCredentialInTx } from "../sql/voters";
import { insertBallotInTx } from "../sql/ballots";

/**
 * 투표 서비스.
 *
 * 핵심 설계: "투표권 사용"(used_credentials)과 "투표 선택값"(ballots)은
 * 같은 트랜잭션 안에서 기록되지만 서로를 참조하는 컬럼이 없다.
 * 트랜잭션이 보장하는 것은 원자성(둘 다 기록되거나 둘 다 안 되거나)뿐이며,
 * 사후에 둘을 연결할 수 있는 데이터는 남지 않는다.
 */

export type CodeCheckResult =
  | { ok: true; codeHash: string }
  | {
      ok: false;
      reason: "invalid" | "used" | "revoked" | "not_open" | "rate_limited";
      message: string;
    };

const FRIENDLY: Record<string, string> = {
  invalid: "잘못된 코드입니다. 코드를 다시 확인해주세요.",
  used: "이미 투표가 완료된 코드입니다.",
  revoked: "사용이 중지된 코드입니다. 관리자에게 문의해주세요.",
  not_open_upcoming: "아직 투표가 시작되지 않았습니다.",
  not_open_closed: "투표가 종료되었습니다.",
  rate_limited: "시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
};

// ---------- 가벼운 rate limit (DB 기반, 서버리스에서도 동작) ----------

const MAX_FAILURES_PER_WINDOW = 10;
const WINDOW_MINUTES = 5;

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

async function isRateLimited(ipHash: string): Promise<boolean> {
  const { rows } = await query<{ count: string }>(
    `select count(*) as count from code_entry_attempts
      where ip_hash = $1 and succeeded = false
        and attempted_at > now() - interval '${WINDOW_MINUTES} minutes'`,
    [ipHash],
  );
  return Number(rows[0].count) >= MAX_FAILURES_PER_WINDOW;
}

async function recordAttempt(ipHash: string, succeeded: boolean) {
  await query(
    "insert into code_entry_attempts (ip_hash, succeeded) values ($1, $2)",
    [ipHash, succeeded],
  );
}

/** 실패 시 응답을 약간 지연시켜 brute-force 비용을 높인다 */
function failureDelay(): Promise<void> {
  return new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
}

// ---------- 코드 검증 (입장 단계) ----------

export async function verifyVoterCode(
  electionId: string,
  rawCode: string,
  clientIp: string,
): Promise<CodeCheckResult> {
  const ipHash = hashIp(clientIp);

  if (await isRateLimited(ipHash)) {
    return { ok: false, reason: "rate_limited", message: FRIENDLY.rate_limited };
  }

  const election = await getElection(electionId);
  if (!election) {
    await recordAttempt(ipHash, false);
    await failureDelay();
    return { ok: false, reason: "invalid", message: FRIENDLY.invalid };
  }

  const phase = getElectionPhase(election);
  if (phase !== "open") {
    return {
      ok: false,
      reason: "not_open",
      message:
        phase === "upcoming" ? FRIENDLY.not_open_upcoming : FRIENDLY.not_open_closed,
    };
  }

  const codeHash = hashCode(rawCode);
  const status = await checkCredentialStatus(electionId, codeHash);

  if (status === "valid") {
    await recordAttempt(ipHash, true);
    return { ok: true, codeHash };
  }

  await recordAttempt(ipHash, false);
  await failureDelay();
  const reason = status === "not_found" ? "invalid" : status;
  return { ok: false, reason, message: FRIENDLY[reason] };
}

// ---------- 투표 제출 ----------

export type SubmitVoteResult =
  | { ok: true }
  | {
      ok: false;
      reason: "already_voted" | "invalid_code" | "invalid_candidate" | "not_open";
      message: string;
    };

export async function submitVote(params: {
  electionId: string;
  codeHash: string;
  candidateId: string;
}): Promise<SubmitVoteResult> {
  const { electionId, codeHash, candidateId } = params;

  const election = await getElection(electionId);
  if (!election) {
    return { ok: false, reason: "invalid_code", message: FRIENDLY.invalid };
  }

  // 후보가 이 선거 소속인지 확인
  const candidate = await getCandidate(candidateId);
  if (!candidate || candidate.electionId !== electionId) {
    return {
      ok: false,
      reason: "invalid_candidate",
      message: "이 후보는 현재 투표할 수 없습니다.",
    };
  }

  try {
    await withTransaction(async (tx) => {
      const credential = await findCredentialInTx(tx, electionId, codeHash);
      if (!credential) {
        throw new VoteError("invalid_code", FRIENDLY.invalid);
      }
      if (credential.isRevoked) {
        throw new VoteError("invalid_code", FRIENDLY.revoked);
      }

      // 투표 기간 재검증 (제출 시점 기준)
      assertVotingOpen(election);

      // 1) 투표권 사용 기록 — PK(election_id, code_hash)가 중복 투표를 차단한다.
      //    candidate_id는 이 테이블에 존재하지 않는다.
      await tx.query(
        "insert into used_credentials (election_id, code_hash) values ($1, $2)",
        [electionId, codeHash],
      );

      // 2) 봉인된 투표지 투입 — code hash / credential id를 절대 저장하지 않는다.
      const sealed = sealChoice({ electionId, candidateId });
      await insertBallotInTx(tx, electionId, sealed);
    });
    return { ok: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, reason: "already_voted", message: FRIENDLY.used };
    }
    if (err instanceof VoteError) {
      return { ok: false, reason: err.reason, message: err.message };
    }
    if (err instanceof Error && err.name === "VotingNotOpenError") {
      return { ok: false, reason: "not_open", message: err.message };
    }
    // 내부 정보(SQL 에러 등)는 노출하지 않는다
    console.error("[vote] submit failed:", err);
    return {
      ok: false,
      reason: "invalid_code",
      message: "투표 처리 중 문제가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

class VoteError extends Error {
  constructor(
    public reason: "invalid_code" | "invalid_candidate",
    message: string,
  ) {
    super(message);
    this.name = "VoteError";
  }
}

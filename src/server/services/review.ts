import { withTransaction } from "../db";
import {
  lockSubmissionForReview,
  listPendingIds,
  markApprovedInTx,
  markRejectedInTx,
} from "../sql/submissions";
import { insertBallotInTx } from "../sql/ballots";
import { insertAuditLog } from "../sql/admin";

/**
 * 검수 서비스 — 승인 / 무효 처리.
 *
 * 승인: 봉인된 선택값을 익명 투표함(ballots)으로 옮기고 제출 레코드에서
 *       삭제한다. 이 순간 이름-표 연결이 영구히 파기된다. 선택값은
 *       옮기는 동안에도 복호화되지 않는다 (암호문 그대로 이동).
 * 무효: 봉인된 선택값을 열어보지 않고 즉시 파기한다.
 *
 * 두 동작 모두 한 번 수행하면 되돌릴 수 없다 — 승인된 표는 익명이 되어
 * 특정할 수 없고, 무효된 표는 내용이 사라졌기 때문이다.
 */

export type ReviewResult =
  | { ok: true }
  | { ok: false; message: string };

export async function approveSubmission(
  submissionId: string,
  adminId: string,
): Promise<ReviewResult> {
  return withTransaction(async (tx) => {
    const submission = await lockSubmissionForReview(tx, submissionId);
    if (!submission) {
      return { ok: false as const, message: "제출을 찾을 수 없습니다." };
    }
    if (submission.status !== "pending" || !submission.sealed) {
      return {
        ok: false as const,
        message: "이미 검수가 완료된 제출입니다.",
      };
    }

    // 암호문 그대로 익명 투표함으로 이동 (복호화 없음)
    await insertBallotInTx(tx, submission.electionId, submission.sealed);
    await markApprovedInTx(tx, submissionId, adminId);

    await insertAuditLog({
      adminId,
      action: "review.approve",
      targetType: "vote_submission",
      targetId: submissionId,
    });
    return { ok: true as const };
  });
}

export async function rejectSubmission(
  submissionId: string,
  adminId: string,
  reason: string | null,
): Promise<ReviewResult> {
  return withTransaction(async (tx) => {
    const submission = await lockSubmissionForReview(tx, submissionId);
    if (!submission) {
      return { ok: false as const, message: "제출을 찾을 수 없습니다." };
    }
    if (submission.status !== "pending") {
      return {
        ok: false as const,
        message:
          submission.status === "approved"
            ? "이미 승인된 표는 익명 투표함에 들어가 무효 처리할 수 없습니다. 승인 전에 검수해주세요."
            : "이미 무효 처리된 제출입니다.",
      };
    }

    await markRejectedInTx(tx, submissionId, adminId, reason);
    await insertAuditLog({
      adminId,
      action: "review.reject",
      targetType: "vote_submission",
      targetId: submissionId,
      metadata: reason ? { reason } : {},
    });
    return { ok: true as const };
  });
}

/** 대기 중인 제출 전체 승인 (한 건씩 동일 트랜잭션 규칙으로 처리) */
export async function approveAllPending(
  electionId: string,
  adminId: string,
): Promise<{ approved: number }> {
  const ids = await listPendingIds(electionId);
  let approved = 0;
  for (const id of ids) {
    const result = await approveSubmission(id, adminId);
    if (result.ok) approved++;
  }
  await insertAuditLog({
    adminId,
    action: "review.approve_all",
    targetType: "election",
    targetId: electionId,
    metadata: { approved },
  });
  return { approved };
}

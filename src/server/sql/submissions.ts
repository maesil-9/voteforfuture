import { query, type Tx } from "../db";
import type { Participation, SubmissionStatus, VoteSubmission } from "../types";
import type { SealedChoice } from "../crypto/ballot-sealing";

/**
 * 투표 제출(vote_submissions) SQL.
 *
 * 비밀투표 원칙:
 * - sealed_choice는 검수 전까지만 존재하는 임시 봉인값이다. 이 모듈은
 *   sealed_choice를 목록 조회에 절대 포함하지 않는다 (검수 트랜잭션 전용).
 * - 승인/무효 처리 후에는 이름과 표를 연결할 데이터가 남지 않는다.
 */

/** 이름 정규화: trim → 연속 공백 정리 → 소문자 */
export function normalizeName(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function insertSubmission(
  electionId: string,
  voterName: string,
  sealed: SealedChoice,
  hasMessage: boolean,
): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `insert into vote_submissions
       (election_id, voter_name, name_normalized, sealed_choice, iv, auth_tag, has_message)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id`,
    [
      electionId,
      voterName.trim(),
      normalizeName(voterName),
      sealed.ciphertext,
      sealed.iv,
      sealed.authTag,
      hasMessage,
    ],
  );
  return rows[0].id;
}

/** 같은 이름의 활성 제출(pending/approved)이 이미 있는지 */
export async function hasActiveSubmission(
  electionId: string,
  voterName: string,
): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `select exists (
       select 1 from vote_submissions
        where election_id = $1 and name_normalized = $2 and status <> 'rejected'
     ) as exists`,
    [electionId, normalizeName(voterName)],
  );
  return rows[0].exists;
}

type SubmissionRow = {
  id: string;
  election_id: string;
  voter_name: string;
  status: SubmissionStatus;
  has_message: boolean;
  reject_reason: string | null;
  submitted_at: Date;
  reviewed_at: Date | null;
};

function mapSubmission(r: SubmissionRow): VoteSubmission {
  return {
    id: r.id,
    electionId: r.election_id,
    voterName: r.voter_name,
    status: r.status,
    hasMessage: r.has_message,
    rejectReason: r.reject_reason,
    submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at,
  };
}

/** 검수 목록 (sealed_choice는 절대 포함하지 않는다 — 메시지도 존재 여부만) */
export async function listSubmissions(
  electionId: string,
): Promise<VoteSubmission[]> {
  const { rows } = await query<SubmissionRow>(
    `select id, election_id, voter_name, status, has_message, reject_reason,
            submitted_at, reviewed_at
       from vote_submissions
      where election_id = $1
      order by (status = 'pending') desc, submitted_at desc`,
    [electionId],
  );
  return rows.map(mapSubmission);
}

/** 검수 트랜잭션 전용: 행 잠금 + 봉인값 포함 단건 조회 */
export async function lockSubmissionForReview(
  tx: Tx,
  submissionId: string,
): Promise<
  | (VoteSubmission & { sealed: SealedChoice | null })
  | null
> {
  const { rows } = await tx.query<
    SubmissionRow & {
      sealed_choice: string | null;
      iv: string | null;
      auth_tag: string | null;
    }
  >(
    `select id, election_id, voter_name, status, has_message, reject_reason,
            submitted_at, reviewed_at, sealed_choice, iv, auth_tag
       from vote_submissions
      where id = $1
      for update`,
    [submissionId],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    ...mapSubmission(r),
    sealed:
      r.sealed_choice && r.iv && r.auth_tag
        ? { ciphertext: r.sealed_choice, iv: r.iv, authTag: r.auth_tag }
        : null,
  };
}

/** 승인: 봉인값을 비우고 상태 갱신 (ballots 이동은 review service의 동일 tx에서) */
export async function markApprovedInTx(
  tx: Tx,
  submissionId: string,
  adminId: string,
): Promise<void> {
  await tx.query(
    `update vote_submissions
        set status = 'approved', sealed_choice = null, iv = null, auth_tag = null,
            reviewed_at = now(), reviewed_by = $2
      where id = $1`,
    [submissionId, adminId],
  );
}

/** 무효: 봉인값을 열어보지 않고 파기 */
export async function markRejectedInTx(
  tx: Tx,
  submissionId: string,
  adminId: string,
  reason: string | null,
): Promise<void> {
  await tx.query(
    `update vote_submissions
        set status = 'rejected', sealed_choice = null, iv = null, auth_tag = null,
            reject_reason = $3, reviewed_at = now(), reviewed_by = $2
      where id = $1`,
    [submissionId, adminId, reason],
  );
}

export async function listPendingIds(electionId: string): Promise<string[]> {
  const { rows } = await query<{ id: string }>(
    `select id from vote_submissions
      where election_id = $1 and status = 'pending'
      order by submitted_at`,
    [electionId],
  );
  return rows.map((r) => r.id);
}

/** 실시간 투표 현황 — aggregate count만 */
export async function getParticipation(
  electionId: string,
): Promise<Participation> {
  const { rows } = await query<{
    submitted: string;
    approved: string;
    pending: string;
    rejected: string;
    expected: number;
  }>(
    `select
       count(*) as submitted,
       count(*) filter (where status = 'approved') as approved,
       count(*) filter (where status = 'pending') as pending,
       count(*) filter (where status = 'rejected') as rejected,
       (select max_voters from elections where id = $1) as expected
       from vote_submissions
      where election_id = $1`,
    [electionId],
  );
  const r = rows[0];
  const expectedVoters = Number(r.expected ?? 0);
  const approved = Number(r.approved);
  return {
    submitted: Number(r.submitted),
    approved,
    pending: Number(r.pending),
    rejected: Number(r.rejected),
    expectedVoters,
    percent:
      expectedVoters > 0
        ? Math.round((approved / expectedVoters) * 1000) / 10
        : null,
  };
}

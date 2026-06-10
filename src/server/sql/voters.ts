import { query, withTransaction, type Tx } from "../db";
import type { Turnout, VoterBatch } from "../types";

/**
 * 유권자 크레덴셜 SQL.
 *
 * 비밀투표 원칙:
 * - 코드 해시만 저장한다. 코드 원문, 유권자 이름/닉네임은 저장하지 않는다.
 * - "어떤 코드가 사용되었는지" 개별 조회 함수를 제공하지 않는다.
 *   used_credentials는 중복 투표 차단(PK)과 count 집계에만 쓰인다.
 */

export async function createBatchWithCredentials(
  electionId: string,
  batchName: string,
  codeHashes: string[],
): Promise<VoterBatch> {
  return withTransaction(async (tx) => {
    const { rows } = await tx.query<{
      id: string;
      election_id: string;
      batch_name: string;
      voter_count: number;
      created_at: Date;
    }>(
      `insert into voter_batches (election_id, batch_name, voter_count)
       values ($1, $2, $3)
       returning id, election_id, batch_name, voter_count, created_at`,
      [electionId, batchName, codeHashes.length],
    );
    const batch = rows[0];
    for (const codeHash of codeHashes) {
      await tx.query(
        `insert into voter_credentials (election_id, batch_id, code_hash)
         values ($1, $2, $3)`,
        [electionId, batch.id, codeHash],
      );
    }
    return {
      id: batch.id,
      electionId: batch.election_id,
      batchName: batch.batch_name,
      voterCount: batch.voter_count,
      createdAt: batch.created_at,
    };
  });
}

export async function listBatches(electionId: string): Promise<VoterBatch[]> {
  const { rows } = await query<{
    id: string;
    election_id: string;
    batch_name: string;
    voter_count: number;
    created_at: Date;
  }>(
    `select id, election_id, batch_name, voter_count, created_at
       from voter_batches
      where election_id = $1
      order by created_at desc`,
    [electionId],
  );
  return rows.map((r) => ({
    id: r.id,
    electionId: r.election_id,
    batchName: r.batch_name,
    voterCount: r.voter_count,
    createdAt: r.created_at,
  }));
}

/** 투표 트랜잭션 내부에서 크레덴셜 유효성 확인 */
export async function findCredentialInTx(
  tx: Tx,
  electionId: string,
  codeHash: string,
): Promise<{ id: string; isRevoked: boolean } | null> {
  const { rows } = await tx.query<{ id: string; is_revoked: boolean }>(
    `select id, is_revoked from voter_credentials
      where election_id = $1 and code_hash = $2`,
    [electionId, codeHash],
  );
  return rows[0] ? { id: rows[0].id, isRevoked: rows[0].is_revoked } : null;
}

/** 코드 입력 단계 검증용 (개별 row 정보는 사용 여부 판단에만 쓰고 노출하지 않는다) */
export async function checkCredentialStatus(
  electionId: string,
  codeHash: string,
): Promise<"valid" | "revoked" | "used" | "not_found"> {
  const { rows } = await query<{ is_revoked: boolean; used: boolean }>(
    `select vc.is_revoked,
            exists (
              select 1 from used_credentials uc
               where uc.election_id = vc.election_id
                 and uc.code_hash = vc.code_hash
            ) as used
       from voter_credentials vc
      where vc.election_id = $1 and vc.code_hash = $2`,
    [electionId, codeHash],
  );
  if (!rows[0]) return "not_found";
  if (rows[0].is_revoked) return "revoked";
  if (rows[0].used) return "used";
  return "valid";
}

/**
 * 투표율 집계. aggregate count만 사용한다 — 개별 유권자/코드 단위 정보는
 * 어떤 경로로도 반환하지 않는다.
 */
export async function getTurnout(electionId: string): Promise<Turnout> {
  const { rows } = await query<{ total: string; used: string }>(
    `select
       (select count(*) from voter_credentials
         where election_id = $1 and is_revoked = false) as total,
       (select count(*) from used_credentials
         where election_id = $1) as used`,
    [electionId],
  );
  const totalVoters = Number(rows[0].total);
  const votesCast = Number(rows[0].used);
  return {
    totalVoters,
    votesCast,
    remaining: Math.max(0, totalVoters - votesCast),
    percent:
      totalVoters === 0
        ? 0
        : Math.round((votesCast / totalVoters) * 1000) / 10,
  };
}

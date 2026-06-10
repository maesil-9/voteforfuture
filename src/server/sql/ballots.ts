import { query, type Tx } from "../db";
import type { SealedChoice } from "../crypto/ballot-sealing";

/**
 * 투표함 SQL.
 * ballots에는 봉인된 선택값만 들어간다.
 * voter id / code hash / credential id 컬럼 자체가 존재하지 않는다.
 */

export async function insertBallotInTx(
  tx: Tx,
  electionId: string,
  sealed: SealedChoice,
): Promise<void> {
  await tx.query(
    `insert into ballots (election_id, encrypted_choice, iv, auth_tag)
     values ($1, $2, $3, $4)`,
    [electionId, sealed.ciphertext, sealed.iv, sealed.authTag],
  );
}

export async function countBallots(electionId: string): Promise<number> {
  const { rows } = await query<{ count: string }>(
    "select count(*) as count from ballots where election_id = $1",
    [electionId],
  );
  return Number(rows[0].count);
}

/**
 * 개표용 봉인 투표지 목록.
 * 주의: 이 함수는 결과 공개 가드를 통과한 results service에서만 호출해야 한다.
 * 반환값은 여전히 암호문이며, 복호화는 unsealChoice(내장 guard)가 담당한다.
 */
export async function listSealedBallots(
  electionId: string,
): Promise<SealedChoice[]> {
  const { rows } = await query<{
    encrypted_choice: string;
    iv: string;
    auth_tag: string;
  }>(
    `select encrypted_choice, iv, auth_tag
       from ballots
      where election_id = $1
      order by created_at`,
    [electionId],
  );
  return rows.map((r) => ({
    ciphertext: r.encrypted_choice,
    iv: r.iv,
    authTag: r.auth_tag,
  }));
}

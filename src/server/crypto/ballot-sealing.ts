import crypto from "node:crypto";
import { env } from "../env";

/**
 * 투표지 봉인 (AES-256-GCM).
 *
 * - ballots 테이블에는 평문 candidate_id가 절대 저장되지 않는다.
 * - plaintext는 { electionId, candidateId } JSON이며, RESULT_SEALING_KEY로만
 *   복호화할 수 있다. DB만 열람해서는 후보별 득표 현황을 알 수 없다.
 * - 복호화(unseal)는 result_visible_at 이후에만 가능하다. guard가 함수 내부에
 *   있어서 결과 발표 전에는 어떤 호출 경로로도 복호화가 불가능하다.
 *
 * 주의: 완전한 암호학적 선거(end-to-end verifiable)를 목표로 하지 않는다.
 * 서버 운영자가 키를 가지고 있다는 한계는 README의 known limitations 참조.
 */

export type SealedChoice = {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
};

export type BallotChoice = {
  electionId: string;
  candidateId: string;
  /** 투표 시 남긴 한 마디 (선택, 50자) — 선택값과 함께 봉인된다 */
  message?: string;
};

export class ResultsSealedError extends Error {
  constructor(resultVisibleAt: Date) {
    super(
      `투표함이 봉인되어 있습니다. 결과는 ${resultVisibleAt.toISOString()} 이후에 열람할 수 있습니다.`,
    );
    this.name = "ResultsSealedError";
  }
}

function sealingKey(): Buffer {
  // 환경변수 문자열 길이와 무관하게 항상 32바이트 키를 얻기 위해 SHA-256으로 유도
  return crypto.createHash("sha256").update(env.resultSealingKey).digest();
}

export function sealChoice(choice: BallotChoice): SealedChoice {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", sealingKey(), iv);
  const plaintext = JSON.stringify(choice);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

/**
 * 봉인 해제. result_visible_at 이전이면 ResultsSealedError를 던진다.
 * 이 guard는 의도적으로 복호화 함수 자체에 내장되어 있다 — 호출하는 쪽에서
 * 깜빡해도 결과 발표 전 개표가 불가능하도록.
 */
export function unsealChoice(
  sealed: SealedChoice,
  opts: { resultVisibleAt: Date; now?: Date },
): BallotChoice {
  const now = opts.now ?? new Date();
  if (now < opts.resultVisibleAt) {
    throw new ResultsSealedError(opts.resultVisibleAt);
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    sealingKey(),
    Buffer.from(sealed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as BallotChoice;
}

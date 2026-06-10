import crypto from "node:crypto";
import { env } from "../env";

/**
 * 유권자 코드 처리.
 *
 * - 코드 원문은 DB에 저장하지 않는다. HMAC-SHA256 해시만 저장한다.
 * - trade-off: 코드 원문을 다시 보여줄 수 없으므로 분실 시 기존 코드 재발급이
 *   불가능하다. 분실자는 관리자가 "추가 코드"를 새로 발급하는 방식으로 처리한다.
 * - 관리자가 최초 배포 CSV를 따로 보관하면 운영상 누가 어떤 코드를 받았는지 알 수
 *   있지만, 시스템 차원에서는 코드-투표 연결 자체를 저장하지 않는 방식으로 보호한다.
 */

/** 표시용 코드에서 사람이 혼동하기 쉬운 문자를 제외한 알파벳 */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_BODY_LENGTH = 8; // CALM- 뒤 4+4

/**
 * 입력 코드 정규화: trim → 대문자 → 공백/하이픈 제거.
 * 비교와 해시는 항상 정규화된 코드 기준으로 수행한다.
 */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, "");
}

/** HMAC-SHA256(normalized code, VOTER_CODE_SECRET) → hex */
export function hashCode(rawCode: string): string {
  const normalized = normalizeCode(rawCode);
  return crypto
    .createHmac("sha256", env.voterCodeSecret)
    .update(normalized)
    .digest("hex");
}

/** 랜덤 투표 코드 생성. 표시 형식: CALM-7KQ2-M9PA */
export function generateVoterCode(): string {
  let body = "";
  while (body.length < CODE_BODY_LENGTH) {
    const byte = crypto.randomBytes(1)[0];
    // 알파벳 길이(31)로 나머지 편향을 피하기 위해 거절 샘플링
    if (byte < Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length) {
      body += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return formatCodeForDisplay(`CALM${body}`);
}

/** CALM7KQ2M9PA → CALM-7KQ2-M9PA */
export function formatCodeForDisplay(code: string): string {
  const normalized = normalizeCode(code);
  return normalized.replace(/(.{4})(?=.)/g, "$1-");
}

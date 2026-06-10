import type { Election } from "../types";
import { ResultsSealedError } from "../crypto/ballot-sealing";

/**
 * 결과 공개 가드.
 * result_visible_at 이전에는:
 *   - 후보별 득표 count 쿼리 금지
 *   - ballot 복호화 금지 (복호화 함수 자체에도 동일 guard 내장)
 *   - admin result API 응답 금지
 *   - 사용자 결과 페이지 표시 금지
 * 허용되는 것은 aggregate turnout(투표율, 총 투표수)뿐이다.
 */

export function isResultVisible(election: Election, now = new Date()): boolean {
  return now >= election.resultVisibleAt;
}

/** 결과 집계/표시 직전에 반드시 호출. 봉인 중이면 throw. */
export function assertResultVisible(election: Election, now = new Date()): void {
  if (!isResultVisible(election, now)) {
    throw new ResultsSealedError(election.resultVisibleAt);
  }
}

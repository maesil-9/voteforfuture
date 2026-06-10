/**
 * 날짜 표시 유틸. 모든 시각은 Asia/Seoul 기준으로 표시한다.
 */

const dateTimeFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

export function formatDateTime(d: Date): string {
  return dateTimeFmt.format(d);
}

export function formatDate(d: Date): string {
  return dateFmt.format(d);
}

/** datetime-local input 값(로컬 시간) ↔ Date 변환 */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

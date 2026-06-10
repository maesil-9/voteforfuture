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

/**
 * datetime-local input ↔ Date 변환.
 * 선거 일정은 서버/브라우저 타임존과 무관하게 항상 KST(Asia/Seoul) 기준으로
 * 해석·표시한다. (Netlify 등 UTC 서버에서 9시간 어긋나는 것을 방지)
 */
const kstPartsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Date → KST 기준 "YYYY-MM-DDTHH:mm" (datetime-local 기본값용) */
export function toKstDatetimeLocalValue(d: Date): string {
  const parts = kstPartsFmt.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** datetime-local 값("YYYY-MM-DDTHH:mm[:ss]")을 KST 기준 시각으로 해석 */
export function parseKstDatetimeLocal(value: string): Date {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!m) return new Date(NaN);
  return new Date(`${m[1]}:00+09:00`);
}

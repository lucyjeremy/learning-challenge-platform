import { TODAY, type Challenge } from "./data";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_MS = 86_400_000;

function toUTC(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, n: number) {
  return new Date(toUTC(date) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

/** "12.04(금)" */
export function fmtDate(date: string) {
  const d = new Date(toUTC(date));
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}.${dd}(${WEEKDAYS[d.getUTCDay()]})`;
}

/** "12월 1일" */
export function fmtMonthDay(date: string) {
  const d = new Date(toUTC(date));
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export function endDate(c: Challenge) {
  return addDays(c.startDate, c.days - 1);
}

export function phase(c: Challenge): "모집 중" | "진행 중" | "종료" {
  if (TODAY < c.startDate) return "모집 중";
  if (TODAY <= endDate(c)) return "진행 중";
  return "종료";
}

/** 오늘이 몇 번째 Day인지 (진행 중일 때만) */
export function currentDay(c: Challenge) {
  return daysBetween(c.startDate, TODAY) + 1;
}

export function requiredCheckins(c: Challenge) {
  return Math.ceil((c.days * c.completionRate) / 100);
}

export type Badge = { label: string; kind: "best" | "status" | "category"; title?: string };

/** 상세설계서 5.3 badgeOf */
export function badgeOf(c: Challenge): Badge {
  if (phase(c) === "진행 중") return { label: "진행 중", kind: "status" };
  if (c.enrolled >= c.capacity) return { label: "정원 마감", kind: "category" };
  const d = daysBetween(TODAY, c.startDate);
  if (d <= 7) {
    const label = d === 0 ? "D-Day" : `D-${d}`;
    return { label, kind: "best", title: d === 0 ? "오늘 시작해요" : `시작까지 ${d}일 남았어요` };
  }
  return { label: "모집 중", kind: "status" };
}

/** 목록용 숫자: 1,000 이상 "1.2천", 10,000 이상 "1.2만" (버림) */
export function shortCount(n: number) {
  if (n >= 10000) return `${Math.floor(n / 1000) / 10}만`;
  if (n >= 1000) return `${Math.floor(n / 100) / 10}천`;
  return String(n);
}

export function priceLabel(price: number) {
  return price === 0 ? "무료" : `${price.toLocaleString("ko-KR")}원`;
}

// Day 날짜·열림·마감 계산. 근거: 상세설계 5.5, 비즈니스 정책서 1.2·BP-CONTENT-002·BP-SUB-002.
// 한국 표준시(KST, UTC+9)는 일광절약시간이 없으므로 고정 오프셋으로 계산한다.
// 모든 함수는 현재 시각을 인자로 받는다(테스트 시각 고정, DDS 5.5의 Clock 주입).

import { CHALLENGE_LIMITS, EARLY_CUTOFF_HOUR_KST } from "./constants";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type UnlockMode = "daily" | "all_at_start";

export type ChallengeTiming = {
  startDate: string; // "YYYY-MM-DD" (KST 기준 날짜)
  durationDays: number;
  unlockMode: UnlockMode;
};

/** KST 달력 날짜 "YYYY-MM-DD" → 그 날 00:00 KST의 시각. */
export function kstMidnight(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - KST_OFFSET_MS);
}

/** 시각 → KST 달력 날짜 "YYYY-MM-DD". */
export function kstDateOf(instant: Date): string {
  const k = new Date(instant.getTime() + KST_OFFSET_MS);
  return k.toISOString().slice(0, 10);
}

/** 시작일에 n일을 더한 KST 날짜 (n은 음수 가능). */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Day N의 날짜 = 시작일 + (N − 1)일. */
export function dayDate(startDate: string, dayNo: number): string {
  return addDays(startDate, dayNo - 1);
}

/** 종료일 = 시작일 + (기간 − 1)일. */
export function endDate(startDate: string, durationDays: number): string {
  return addDays(startDate, durationDays - 1);
}

/** Day N이 열리는 시각. 매일 열림: Day 날짜 00:00 KST, 전부 열림: 시작일 00:00 KST. */
export function openAt(c: ChallengeTiming, dayNo: number): Date {
  return kstMidnight(c.unlockMode === "all_at_start" ? c.startDate : dayDate(c.startDate, dayNo));
}

export function isOpen(c: ChallengeTiming, dayNo: number, now: Date): boolean {
  return openAt(c, dayNo).getTime() <= now.getTime();
}

/** Day N 마감 시각(배타적): Day 날짜 다음 날 00:00 KST. 이 시각부터 제출 거절. */
export function deadline(startDate: string, dayNo: number): Date {
  return kstMidnight(addDays(dayDate(startDate, dayNo), 1));
}

/** 조기 인증: 최초 제출이 Day 날짜 21:00:00 KST보다 이르면 true. 수정해도 최초 제출 시각은 바뀌지 않는다. */
export function isEarly(firstSubmittedAt: Date, startDate: string, dayNo: number): boolean {
  const cutoff = new Date(kstMidnight(dayDate(startDate, dayNo)).getTime() + EARLY_CUTOFF_HOUR_KST * 60 * 60 * 1000);
  return firstSubmittedAt.getTime() < cutoff.getTime();
}

/** 오늘(KST 기준)이 몇 번째 Day인지. 기간 밖이면 null. */
export function todayDayNo(c: ChallengeTiming, now: Date): number | null {
  const diff = Math.round((kstMidnight(kstDateOf(now)).getTime() - kstMidnight(c.startDate).getTime()) / DAY_MS);
  const dayNo = diff + 1;
  return dayNo >= 1 && dayNo <= c.durationDays ? dayNo : null;
}

/** 완주 필요 인증 수 = 올림(기간 × 완주 조건 ÷ 100), 정수 계산. BP-DONE-001-1. */
export function requiredCount(durationDays: number, completionRate: number): number {
  return Math.floor((durationDays * completionRate + 99) / 100);
}

/** 시작일 검증: 검수 요청일 기준 3일 ~ 90일 뒤 (BP-CHAL-002). */
export function isValidStartDate(startDate: string, requestedOn: string): boolean {
  const diff = Math.round((kstMidnight(startDate).getTime() - kstMidnight(requestedOn).getTime()) / DAY_MS);
  return diff >= CHALLENGE_LIMITS.startLeadDays.min && diff <= CHALLENGE_LIMITS.startLeadDays.max;
}

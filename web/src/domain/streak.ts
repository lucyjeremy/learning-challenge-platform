// 스트릭(연속 인증)과 연속 보상. 근거: 상세설계 5.8, 비즈니스 정책서 BP-POINT-001·005.

import { POINTS } from "./constants";

export type DayState = "approved" | "pending" | "rejected" | "none";

export type DayRecord = {
  dayNo: number;
  state: DayState;
  deadline: Date; // 이 시각(배타적)이 지나면 "오늘 이전에 끝난 Day"로 본다
};

export type StreakResult = { current: number; longest: number };

/**
 * 스트릭 계산 (BP-POINT-005):
 * - 인정(approved)은 +1
 * - 대기(pending)는 더하지도 끊지도 않음
 * - 인정·대기가 없고 마감이 지난 Day(none/rejected)는 0으로 리셋
 * - 마감 전인 none은 아직 끊긴 게 아니므로 건너뜀
 * days는 dayNo 오름차순이어야 하며, 오늘까지 열린 Day만 넣는다.
 */
export function calculateStreak(days: DayRecord[], now: Date): StreakResult {
  let run = 0;
  let longest = 0;
  for (const d of days) {
    if (d.state === "approved") {
      run += 1;
      longest = Math.max(longest, run);
    } else if (d.state === "pending") {
      continue;
    } else if (now.getTime() >= d.deadline.getTime()) {
      run = 0;
    }
  }
  return { current: run, longest };
}

/**
 * 연속 보상 목록: 최장 스트릭이 달성한 7의 배수마다 보상 1회.
 * 21의 배수는 +100, 나머지 7의 배수는 +30 (21의 배수일 때 +30은 없음).
 */
export function expectedStreakBonuses(longest: number): { milestone: number; points: number }[] {
  const out: { milestone: number; points: number }[] = [];
  for (let m = 7; m <= longest; m += 7) {
    out.push({ milestone: m, points: m % 21 === 0 ? POINTS.STREAK_21 : POINTS.STREAK_7 });
  }
  return out;
}

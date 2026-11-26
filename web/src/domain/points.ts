// 포인트 원장과 레벨. 근거: 상세설계 5.8, 비즈니스 정책서 BP-POINT-001~004.
// 합계를 따로 저장하지 않고 원장(point_logs)의 합으로 계산한다. 적립과 회수는 기록을 지우지 않고 추가한다.

import { LEVEL_THRESHOLDS } from "./constants";

export type PointLog = {
  sourceKey: string; // 예: "proof:{submissionId}", "like:{likeId}", "streak:{enrollmentId}:{value}"
  points: number; // 음수면 회수
};

/** 원인 데이터 하나의 순 점수 (적립 합 − 회수 합). */
export function netForSource(logs: PointLog[], sourceKey: string): number {
  return logs.filter((l) => l.sourceKey === sourceKey).reduce((sum, l) => sum + l.points, 0);
}

/**
 * 멱등 적립 (BP-POINT-001-2): 같은 원인으로 순 점수가 이미 양수면 적립하지 않는다.
 * 반환값은 새로 추가할 로그(없으면 null).
 */
export function awardIfNew(logs: PointLog[], sourceKey: string, points: number): PointLog | null {
  if (netForSource(logs, sourceKey) > 0) return null;
  return { sourceKey, points };
}

/**
 * 회수 (BP-POINT-003): 원인의 순 점수만큼 음수 로그를 추가한다. 순 점수가 0 이하면 아무것도 하지 않는다.
 */
export function revokeIfAny(logs: PointLog[], sourceKey: string): PointLog | null {
  const net = netForSource(logs, sourceKey);
  if (net <= 0) return null;
  return { sourceKey, points: -net };
}

export function totalPoints(logs: PointLog[]): number {
  return logs.reduce((sum, l) => sum + l.points, 0);
}

/** 누적 포인트 → 레벨 (1~9). */
export function levelOf(total: number): number {
  let level = 1;
  LEVEL_THRESHOLDS.forEach((threshold, i) => {
    if (total >= threshold) level = i + 1;
  });
  return level;
}

/** 다음 레벨까지 남은 포인트. 최고 레벨이면 null. */
export function nextLevelGap(total: number): number | null {
  const level = levelOf(total);
  if (level >= LEVEL_THRESHOLDS.length) return null;
  return LEVEL_THRESHOLDS[level] - total;
}

export type LeaderRow = { userId: string; points: number; lastChangedAt: Date | null };

/**
 * 리더보드 정렬 (BP-POINT-004-4): 점수 내림차순, 같은 점수는 마지막 점수 변동 시각이 이른 사람이 위.
 * 순위는 1, 1, 3 식으로 건너뛴다(같은 점수면 같은 순위).
 */
export function rankLeaderboard(rows: LeaderRow[]): (LeaderRow & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const at = a.lastChangedAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const bt = b.lastChangedAt?.getTime() ?? Number.POSITIVE_INFINITY;
    return at - bt;
  });
  let prevPoints: number | null = null;
  let prevRank = 0;
  return sorted.map((row, i) => {
    const rank = row.points === prevPoints ? prevRank : i + 1;
    prevPoints = row.points;
    prevRank = rank;
    return { ...row, rank };
  });
}

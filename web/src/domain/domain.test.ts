import { describe, expect, it } from "vitest";
import {
  addDays,
  dayDate,
  deadline,
  endDate,
  isEarly,
  isOpen,
  isValidStartDate,
  kstDateOf,
  kstMidnight,
  openAt,
  requiredCount,
  todayDayNo,
} from "./day-calendar";
import { calculateStreak, expectedStreakBonuses, type DayRecord } from "./streak";
import { awardIfNew, levelOf, nextLevelGap, rankLeaderboard, revokeIfAny, totalPoints, type PointLog } from "./points";
import { isAllowedVideoUrl, validateChallengeRules, validateProof } from "./validation";

// 테스트용 시각은 모두 KST로 쓴다 (+09:00)
const kst = (s: string) => new Date(s + "+09:00");

describe("Day 날짜와 마감 (NFR-012, BP-SUB-002-1)", () => {
  it("Day N 날짜는 시작일 + (N-1)일", () => {
    expect(dayDate("2026-12-01", 1)).toBe("2026-12-01");
    expect(dayDate("2026-12-01", 21)).toBe("2026-12-21");
    expect(endDate("2026-12-01", 21)).toBe("2026-12-21");
  });

  it("월과 연도를 넘어가도 날짜가 맞다", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("마감은 Day 날짜 다음 날 00:00 KST (배타적). 23:59:59.999는 열려 있고 00:00:00.000은 닫힌다", () => {
    const d = deadline("2026-12-01", 3); // Day 3 = 12-03, 마감 12-04 00:00
    expect(d.getTime()).toBe(kst("2026-12-04T00:00:00.000").getTime());
    expect(kst("2026-12-03T23:59:59.999").getTime()).toBeLessThan(d.getTime());
    expect(kst("2026-12-04T00:00:00.000").getTime()).toBeGreaterThanOrEqual(d.getTime());
  });

  it("매일 열림: Day N은 Day 날짜 00:00에 열린다", () => {
    const c = { startDate: "2026-12-01", durationDays: 21, unlockMode: "daily" as const };
    expect(openAt(c, 4).getTime()).toBe(kst("2026-12-04T00:00:00").getTime());
    expect(isOpen(c, 4, kst("2026-12-03T23:59:59"))).toBe(false);
    expect(isOpen(c, 4, kst("2026-12-04T00:00:00"))).toBe(true);
  });

  it("전부 열림: 모든 Day가 시작일 00:00에 열린다", () => {
    const c = { startDate: "2026-12-01", durationDays: 21, unlockMode: "all_at_start" as const };
    expect(isOpen(c, 21, kst("2026-12-01T00:00:00"))).toBe(true);
  });

  it("오늘이 몇 번째 Day인지 KST 기준으로 구한다. 기간 밖이면 null", () => {
    const c = { startDate: "2026-12-01", durationDays: 21, unlockMode: "daily" as const };
    expect(todayDayNo(c, kst("2026-12-01T00:00:00"))).toBe(1);
    expect(todayDayNo(c, kst("2026-12-03T23:59:00"))).toBe(3);
    expect(todayDayNo(c, kst("2026-11-30T23:59:59"))).toBeNull();
    expect(todayDayNo(c, kst("2026-12-22T00:00:00"))).toBeNull();
  });

  it("KST 날짜 변환", () => {
    expect(kstDateOf(kst("2026-12-03T23:59:59"))).toBe("2026-12-03");
    expect(kstMidnight("2026-12-03").getTime()).toBe(kst("2026-12-03T00:00:00").getTime());
  });
});

describe("조기 인증 (BP-POINT-001)", () => {
  it("최초 제출이 Day 날짜 21:00 전이면 조기 인증", () => {
    expect(isEarly(kst("2026-12-03T20:59:59.999"), "2026-12-01", 3)).toBe(true);
  });

  it("21:00:00 정각부터는 조기 인증이 아니다", () => {
    expect(isEarly(kst("2026-12-03T21:00:00.000"), "2026-12-01", 3)).toBe(false);
  });
});

describe("완주 필요 인증 수 (BP-DONE-001-1)", () => {
  it("올림 계산: 21일 80% = 17, 7일 100% = 7, 10일 50% = 5", () => {
    expect(requiredCount(21, 80)).toBe(17);
    expect(requiredCount(7, 100)).toBe(7);
    expect(requiredCount(10, 50)).toBe(5);
  });

  it("16.8은 17로 올린다 (정수 계산에서도 같은 결과)", () => {
    expect(requiredCount(21, 80)).toBe(Math.ceil((21 * 80) / 100));
  });
});

describe("시작일 범위 (BP-CHAL-002)", () => {
  it("검수 요청 3일 뒤부터 90일 뒤까지만 허용", () => {
    expect(isValidStartDate("2026-11-27", "2026-11-24")).toBe(true);
    expect(isValidStartDate("2026-11-26", "2026-11-24")).toBe(false);
    expect(isValidStartDate("2027-02-22", "2026-11-24")).toBe(true);
    expect(isValidStartDate("2027-02-23", "2026-11-24")).toBe(false);
  });
});

describe("스트릭 (BP-POINT-005)", () => {
  const dl = (day: number) => deadline("2026-12-01", day);
  const rec = (dayNo: number, state: DayRecord["state"]): DayRecord => ({ dayNo, state, deadline: dl(dayNo) });

  it("인정이 이어지면 연속 일수가 늘어난다", () => {
    const days = [rec(1, "approved"), rec(2, "approved"), rec(3, "approved")];
    expect(calculateStreak(days, kst("2026-12-10T00:00:00"))).toEqual({ current: 3, longest: 3 });
  });

  it("마감이 지난 미인증 Day가 있으면 그 뒤부터 다시 센다", () => {
    const days = [rec(1, "approved"), rec(2, "approved"), rec(3, "none"), rec(4, "approved")];
    expect(calculateStreak(days, kst("2026-12-10T00:00:00"))).toEqual({ current: 1, longest: 2 });
  });

  it("대기 중인 Day는 끊지도 더하지도 않는다", () => {
    const days = [rec(1, "approved"), rec(2, "pending"), rec(3, "approved")];
    expect(calculateStreak(days, kst("2026-12-10T00:00:00"))).toEqual({ current: 2, longest: 2 });
  });

  it("마감 전의 미인증은 아직 끊긴 게 아니다", () => {
    const days = [rec(1, "approved"), rec(2, "approved"), rec(3, "none")];
    // 지금은 Day 3 마감(12-04 00:00) 전 → 끊기지 않음
    expect(calculateStreak(days, kst("2026-12-03T10:00:00"))).toEqual({ current: 2, longest: 2 });
  });

  it("연속 보상: 7의 배수마다 +30, 21의 배수는 +100 (+30 없음)", () => {
    expect(expectedStreakBonuses(6)).toEqual([]);
    expect(expectedStreakBonuses(7)).toEqual([{ milestone: 7, points: 30 }]);
    expect(expectedStreakBonuses(21)).toEqual([
      { milestone: 7, points: 30 },
      { milestone: 14, points: 30 },
      { milestone: 21, points: 100 },
    ]);
  });
});

describe("포인트 원장 (BP-POINT-001~003)", () => {
  it("같은 원인은 한 번만 적립된다 (멱등)", () => {
    let logs: PointLog[] = [];
    const first = awardIfNew(logs, "proof:S1", 10);
    expect(first).not.toBeNull();
    logs = [...logs, first!];
    expect(awardIfNew(logs, "proof:S1", 10)).toBeNull();
  });

  it("회수는 순 점수만큼 음수 로그를 추가하고, 두 번 회수하지 않는다", () => {
    let logs: PointLog[] = [{ sourceKey: "proof:S1", points: 10 }, { sourceKey: "proof:S1", points: 5 }];
    const r = revokeIfAny(logs, "proof:S1");
    expect(r).toEqual({ sourceKey: "proof:S1", points: -15 });
    logs = [...logs, r!];
    expect(revokeIfAny(logs, "proof:S1")).toBeNull();
    expect(totalPoints(logs)).toBe(0);
  });

  it("회수 후 같은 원인을 다시 적립하면 새로 들어간다 (삭제 후 재제출)", () => {
    const logs: PointLog[] = [{ sourceKey: "proof:S1", points: 10 }, { sourceKey: "proof:S1", points: -10 }];
    expect(awardIfNew(logs, "proof:S1", 10)).not.toBeNull();
  });
});

describe("레벨 (BP-POINT-002)", () => {
  it("누적 포인트 기준으로 Lv1~Lv9", () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(19)).toBe(1);
    expect(levelOf(20)).toBe(2);
    expect(levelOf(135)).toBe(3); // 명세 FR-018-AC1
    expect(levelOf(3000)).toBe(9);
    expect(levelOf(99999)).toBe(9);
  });

  it("다음 레벨까지 남은 포인트", () => {
    expect(nextLevelGap(135)).toBe(15); // Lv4(150)까지 15점
    expect(nextLevelGap(3000)).toBeNull();
  });
});

describe("리더보드 순위 (BP-POINT-004-4)", () => {
  it("점수 내림차순, 같은 점수는 먼저 변동된 사람이 위, 순위는 1, 1, 3", () => {
    const ranked = rankLeaderboard([
      { userId: "A", points: 50, lastChangedAt: kst("2026-12-02T10:00:00") },
      { userId: "B", points: 50, lastChangedAt: kst("2026-12-01T10:00:00") },
      { userId: "C", points: 40, lastChangedAt: kst("2026-12-01T09:00:00") },
    ]);
    expect(ranked.map((r) => [r.userId, r.rank])).toEqual([
      ["B", 1],
      ["A", 1],
      ["C", 3],
    ]);
  });
});

describe("인증 형식 검증 (BP-SUB-001)", () => {
  it("텍스트는 10자 이상 2,000자 이하", () => {
    expect(validateProof("text", { body: "짧음" })).toHaveLength(1);
    expect(validateProof("text", { body: "열자이상의내용입니다" })).toEqual([]);
  });

  it("사진은 1~3장, 장당 10MB 이하", () => {
    expect(validateProof("photo", { photoPaths: [] })).toHaveLength(1);
    expect(validateProof("photo", { photoPaths: ["a", "b", "c", "d"] })).toHaveLength(1);
    expect(validateProof("photo", { photoPaths: ["a"], photoSizesBytes: [11 * 1024 * 1024] })).toHaveLength(1);
    expect(validateProof("photo", { photoPaths: ["a"], photoSizesBytes: [10 * 1024 * 1024] })).toEqual([]);
  });

  it("링크는 http(s)만 허용", () => {
    expect(validateProof("link", { linkUrl: "javascript:alert(1)" })).toHaveLength(1);
    expect(validateProof("link", { linkUrl: "https://example.com" })).toEqual([]);
  });

  it("체크는 한마디 200자 이하", () => {
    expect(validateProof("check", { body: "가".repeat(201) })).toHaveLength(1);
    expect(validateProof("check", {})).toEqual([]);
  });
});

describe("챌린지 규칙과 영상 링크 (BP-CHAL-002, 상세설계 5.5)", () => {
  it("기간·정원·완주 조건 범위", () => {
    expect(validateChallengeRules({ durationDays: 21, capacity: 30, completionRate: 80 })).toEqual([]);
    expect(validateChallengeRules({ durationDays: 6, capacity: 30, completionRate: 80 })).toHaveLength(1);
    expect(validateChallengeRules({ durationDays: 21, capacity: 301, completionRate: 80 })).toHaveLength(1);
    expect(validateChallengeRules({ durationDays: 21, capacity: 30, completionRate: 85 })).toHaveLength(1);
  });

  it("영상 링크는 YouTube·Vimeo만", () => {
    expect(isAllowedVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isAllowedVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isAllowedVideoUrl("https://vimeo.com/123456")).toBe(true);
    expect(isAllowedVideoUrl("https://example.com/video")).toBe(false);
  });
});

// 정책 상수. 근거: 비즈니스 정책서 BP-POINT-001·002, BP-CHAL-002, BP-SUB-002.
// SQL 쪽 값은 supabase 마이그레이션 주석에 같은 이름으로 적는다.

export const POINTS = {
  PROOF: 10, // BP-POINT-001 인증 인정
  EARLY: 5, // 조기 인증 (최초 제출이 Day 날짜 21:00 KST 이전)
  LIKE: 1, // 받은 좋아요 (글 작성자)
  COMMENT: 2, // 댓글 작성
  COMMENT_DAILY_LIMIT: 5, // 하루 댓글 적립 최대 5개 (10점)
  STREAK_7: 30, // 7의 배수 연속 보상
  STREAK_21: 100, // 21의 배수 연속 보상 (이때는 7의 배수 보상 대신)
} as const;

// BP-POINT-002 누적 포인트 기준 (Lv1~Lv9)
export const LEVEL_THRESHOLDS = [0, 20, 60, 150, 300, 600, 1000, 2000, 3000] as const;

export const EARLY_CUTOFF_HOUR_KST = 21; // Day 날짜 21:00:00 KST 이전이면 조기 인증

export const CHALLENGE_LIMITS = {
  durationDays: { min: 7, max: 60 },
  capacity: { min: 1, max: 300 },
  completionRate: { min: 50, max: 100, step: 10, default: 80 },
  maxConcurrentEnrollments: 5, // BP-ENR-001-5
  startLeadDays: { min: 3, max: 90 }, // BP-CHAL-002 시작일 범위
} as const;

export const PROOF_LIMITS = {
  textBody: { min: 10, max: 2000 },
  photoCount: { min: 1, max: 3 },
  photoMaxBytes: 10 * 1024 * 1024,
  noteMax: 500,
  checkNoteMax: 200,
} as const;

import { beforeEach, describe, expect, it } from "vitest";
import { challenges } from "@/lib/data";
import {
  addComment,
  cancelEnrollment,
  createPost,
  deletePost,
  editPost,
  isInstructorOf,
  leaderboardFor,
  todayCheckinsFor,
  enroll,
  enrolledCount,
  pointsOf,
  postsOf,
  resetStoreForTest,
  streakOf,
  submitProof,
  toggleLike,
  mySubmission,
} from "./store";

// 시각은 KST로 고정해서 쓴다.
const kst = (s: string) => new Date(s + "+09:00");

// python-21: 2026-11-19 시작, 21일, 텍스트 인증, 자동 인정, 시드 참여자 김지은(u-student)
// 기준 시각 2026-11-25 (Day 7 진행 중)
const PY = "python-21";
const FULL_ID = "morning-21"; // 정원 100/100 (2026-12-01 시작)
const NOW = kst("2026-11-25T10:00:00");
const LONG_TEXT = "열 글자 이상의 인증 내용입니다";

beforeEach(() => {
  resetStoreForTest();
});

describe("신청 (BP-ENR-001, FR-012)", () => {
  it("모집 중인 챌린지에 신청하면 참여 인원이 늘어난다", () => {
    const c = challenges.find((x) => x.id === "figma-14")!;
    const before = enrolledCount(c);
    const r = enroll("u-student", "figma-14", NOW);
    expect(r.ok).toBe(true);
    expect(enrolledCount(c)).toBe(before + 1);
  });

  it("같은 챌린지에 두 번 신청할 수 없다", () => {
    enroll("u-student", "figma-14", NOW);
    const again = enroll("u-student", "figma-14", NOW);
    expect(again.ok).toBe(false);
  });

  it("시작일이 지난 챌린지는 신청할 수 없다 (늦은 신청 불가)", () => {
    const r = enroll("u-student", PY, NOW);
    expect(r.ok).toBe(false);
  });

  it("정원이 찬 챌린지는 신청할 수 없다 (정원 100/100 챌린지)", () => {
    const r = enroll("u-student", FULL_ID, kst("2026-11-25T10:00:00"));
    expect(r.ok).toBe(false);
  });

  it("활성 신청은 최대 5개", () => {
    const recruiting = challenges.filter((c) => c.startDate > "2026-11-25" && c.enrolled < c.capacity);
    // 이미 python-21(진행 중)에 1개 있으므로, 모집 중 4개까지만 더 된다
    let okCount = 0;
    for (const c of recruiting) {
      if (enroll("u-student", c.id, NOW).ok) okCount++;
    }
    expect(okCount).toBeLessThanOrEqual(4);
  });

  it("시작 전 취소는 가능하고, 시작 후에는 취소할 수 없다", () => {
    enroll("u-student", "figma-14", NOW);
    // figma-14는 11-28 시작. 11-28 당일에는 취소할 수 없다
    expect(cancelEnrollment("u-student", "figma-14", kst("2026-11-28T00:00:00")).ok).toBe(false);
    expect(cancelEnrollment("u-student", "figma-14", kst("2026-11-27T23:59:59")).ok).toBe(true);
  });
});

describe("인증 (BP-SUB-002, BP-POINT-001, BP-POINT-005)", () => {
  it("마감 23:59:59.999에는 제출되고, 00:00:00.000에는 거절된다", () => {
    // Day 7 = 2026-11-25. 마감 = 11-26 00:00.
    const inTime = submitProof("u-student", PY, 7, { body: LONG_TEXT, visibility: "private" }, kst("2026-11-25T23:59:59.999"));
    expect(inTime.ok).toBe(true);
    resetStoreForTest();
    const late = submitProof("u-student", PY, 7, { body: LONG_TEXT, visibility: "private" }, kst("2026-11-26T00:00:00.000"));
    expect(late.ok).toBe(false);
  });

  it("21:00 전 제출은 +10 +5, 21:00 이후는 +10", () => {
    const early = submitProof("u-student", PY, 7, { body: LONG_TEXT, visibility: "private" }, kst("2026-11-25T20:59:59.999"));
    expect(early.ok && early.value.points).toBe(15);
    resetStoreForTest();
    const late = submitProof("u-student", PY, 7, { body: LONG_TEXT, visibility: "private" }, kst("2026-11-25T21:00:00.000"));
    expect(late.ok && late.value.points).toBe(10);
  });

  it("같은 Day는 한 번만 인증할 수 있다", () => {
    submitProof("u-student", PY, 7, { body: LONG_TEXT, visibility: "private" }, NOW);
    const again = submitProof("u-student", PY, 7, { body: LONG_TEXT, visibility: "private" }, NOW);
    expect(again.ok).toBe(false);
    expect(mySubmission("u-student", PY, 7)).toBeDefined();
  });

  it("공개 인증은 피드 글이 되고, 비공개는 되지 않는다", () => {
    const before = postsOf(PY).length;
    submitProof("u-student", PY, 7, { body: LONG_TEXT, visibility: "public" }, NOW);
    expect(postsOf(PY).length).toBe(before + 1);
    submitProof("u-student", PY, 6, { body: LONG_TEXT, visibility: "private" }, NOW);
    expect(postsOf(PY).length).toBe(before + 1);
  });

  it("인증이 쌓이면 스트릭이 늘고, 7일째에 연속 보상 +30", () => {
    // Day 1~7을 순서대로 인증 (기준 시각을 각 Day 낮 12시로)
    let last: ReturnType<typeof submitProof> | undefined;
    for (let d = 1; d <= 7; d++) {
      const day = `2026-11-${String(18 + d).padStart(2, "0")}`; // Day 1 = 11-19
      last = submitProof("u-student", PY, d, { body: LONG_TEXT, visibility: "private" }, kst(`${day}T12:00:00`));
      expect(last.ok).toBe(true);
    }
    const at = kst("2026-11-25T12:00:00");
    expect(streakOf("u-student", PY, at).current).toBe(7);
    expect(streakOf("u-student", PY, at).longest).toBe(7);
  });

  it("텍스트 형식에서 10자 미만은 거절", () => {
    const r = submitProof("u-student", PY, 7, { body: "짧음", visibility: "private" }, NOW);
    expect(r.ok).toBe(false);
  });

  it("신청하지 않은 사람은 인증할 수 없다", () => {
    const r = submitProof("u-instructor", PY, 7, { body: LONG_TEXT, visibility: "private" }, NOW);
    expect(r.ok).toBe(false);
  });
});

describe("피드 (BP-FEED, BP-POINT-001)", () => {
  it("좋아요는 한 번만 되고, 취소하면 작성자 점수가 회수된다", () => {
    const created = createPost("u-student", PY, "자유", "오늘 배운 것을 나눠요", NOW);
    expect(created.ok).toBe(true);
    const id = created.ok ? created.value : "";
    const before = pointsOf("u-student", PY);
    // 다른 사람이 좋아요 → 작성자 +1 (자기 글이라 0이지만, 같은 사람이 다시 누르면 취소)
    expect(toggleLike("u-student", id).ok).toBe(true); // 본인 좋아요: 0점
    expect(pointsOf("u-student", PY)).toBe(before);
  });

  it("댓글은 본인 글에 쓰면 0점, 하루 5개까지 적립", () => {
    const created = createPost("u-student", PY, "자유", "질문이 있어요", NOW);
    const id = created.ok ? created.value : "";
    const before = pointsOf("u-student", PY);
    const r = addComment("u-student", id, "본인 댓글", NOW);
    expect(r.ok).toBe(true);
    expect(pointsOf("u-student", PY)).toBe(before); // 본인 글 댓글은 0점
  });

  it("같은 글 id로 다시 보내면 글이 한 번만 생긴다 (응답 유실 후 재시도)", () => {
    const id = "0b9c7a52-3f1e-4c8a-9d2b-6e5f4a3b2c1d";
    const before = postsOf(PY).length;
    const first = createPost("u-student", PY, "자유", "재시도 점검 글", NOW, { title: "재시도", id });
    const again = createPost("u-student", PY, "자유", "재시도 점검 글", NOW, { title: "재시도", id });
    expect(first).toEqual({ ok: true, value: id });
    expect(again).toEqual({ ok: true, value: id });
    expect(postsOf(PY).length).toBe(before + 1);
    expect(createPost("u-student", PY, "자유", "형식이 틀린 id", NOW, { id: "not-a-uuid" }).ok).toBe(false);
  });

  it("공지는 강사만 올릴 수 있다", () => {
    const r = createPost("u-student", PY, "공지", "학생이 공지를 올려요", NOW);
    expect(r.ok).toBe(false);
  });

  it("글은 작성자만 수정할 수 있고, 수정하면 수정 시각이 남는다", () => {
    const created = createPost("u-student", PY, "질문", "처음 내용", NOW, { title: "제목" });
    const id = created.ok ? created.value : "";
    expect(editPost("u-instructor", id, { kind: "질문", title: "남의 글", body: "바꿈" }, NOW).ok).toBe(false);
    expect(editPost("u-student", id, { kind: "자유", title: "새 제목", body: "바꾼 내용" }, NOW).ok).toBe(true);
    const post = postsOf(PY).find((p) => p.id === id)!;
    expect([post.kind, post.title, post.body, !!post.editedAt]).toEqual(["자유", "새 제목", "바꾼 내용", true]);
  });

  it("제목이 비었거나 60자를 넘으면 거절", () => {
    expect(createPost("u-student", PY, "자유", "내용", NOW, { title: " " }).ok).toBe(false);
    expect(createPost("u-student", PY, "자유", "내용", NOW, { title: "가".repeat(61) }).ok).toBe(false);
  });

  it("글을 삭제하면 피드에서 사라지고, 다른 사람은 삭제할 수 없다", () => {
    const created = createPost("u-student", PY, "자유", "지울 글", NOW);
    const id = created.ok ? created.value : "";
    expect(deletePost("u-admin", id).ok).toBe(false);
    expect(deletePost("u-student", id).ok).toBe(true);
    expect(postsOf(PY).some((p) => p.id === id)).toBe(false);
  });

  it("종료된 챌린지에는 글을 쓸 수 없다", () => {
    const r = createPost("u-student", "python-21", "자유", "지난 챌린지 글", kst("2027-01-01T10:00:00"));
    expect(r.ok).toBe(false);
  });
});

describe("리더보드·오늘 인증 수 (BP-POINT-004, TC-FN-LB)", () => {
  it("원장 합계로 순위를 매기고, 0점 참여자와 내 순위가 보인다", () => {
    enroll("u-student", "figma-14", NOW);
    submitProof("u-student", PY, 7, { body: LONG_TEXT, visibility: "private" }, NOW);
    const board = leaderboardFor(PY, "u-student", NOW)["전체"];
    expect(board[0]).toMatchObject({ id: "u-student", points: 15, me: true });
    const figma = leaderboardFor("figma-14", "u-student", NOW)["전체"];
    expect(figma[0]).toMatchObject({ id: "u-student", points: 0, me: true });
  });

  it("오늘 인증한 참여자 수 / 참여자 수", () => {
    expect(todayCheckinsFor(PY, NOW)).toEqual({ done: 0, total: 1 });
    submitProof("u-student", PY, 7, { body: LONG_TEXT, visibility: "private" }, NOW);
    expect(todayCheckinsFor(PY, NOW)).toEqual({ done: 1, total: 1 });
  });

  it("강사 확인은 그 챌린지의 강사만 참", () => {
    expect(isInstructorOf("u-instructor", PY)).toBe(true);
    expect(isInstructorOf("u-instructor", "figma-14")).toBe(false);
    expect(isInstructorOf("u-student", PY)).toBe(false);
  });
});

describe("보안 회귀 (SEC-01~03)", () => {
  it("SEC-01 글 종류는 공지(강사)·질문·자유만 만들 수 있다", () => {
    const fake = createPost("u-student", PY, "인증" as "질문", "가짜 인증 글입니다", NOW);
    expect(fake.ok).toBe(false);
    expect(postsOf(PY).some((p) => p.kind === "인증" && p.body === "가짜 인증 글입니다")).toBe(false);
  });

  it("SEC-01 글을 고칠 때 공지·인증으로 바꿀 수 없다", () => {
    const created = createPost("u-student", PY, "자유", "평범한 글", NOW);
    const id = created.ok ? created.value : "";
    expect(editPost("u-student", id, { kind: "공지" as "자유", body: "가짜 공지" }, NOW).ok).toBe(false);
    expect(editPost("u-student", id, { kind: "인증" as "자유", body: "가짜 인증" }, NOW).ok).toBe(false);
    expect(postsOf(PY).find((p) => p.id === id)!.kind).toBe("자유");
  });

  it("SEC-02 사진 형식은 업로드가 준비될 때까지 photoPaths만으로 인증되지 않는다", () => {
    expect(enroll("u-student", "run-28", kst("2026-11-05T09:00:00")).ok).toBe(true);
    const before = pointsOf("u-student", "run-28");
    const r = submitProof("u-student", "run-28", 10, { photoPaths: ["x"], photoSizesBytes: [1], visibility: "private" }, kst("2026-11-20T10:00:00"));
    expect(r.ok).toBe(false);
    expect(pointsOf("u-student", "run-28")).toBe(before);
    expect(mySubmission("u-student", "run-28", 10)).toBeUndefined();
  });

  it("SEC-03 링크 형식이 아니면 linkUrl을 저장하지도 글 본문에 쓰지도 않는다", () => {
    const r = submitProof("u-student", PY, 7, { body: LONG_TEXT, linkUrl: "javascript:alert(1)", visibility: "public" }, NOW);
    expect(r.ok).toBe(true);
    expect(mySubmission("u-student", PY, 7)?.linkUrl).toBeUndefined();
    const post = postsOf(PY).find((p) => p.id === (r.ok ? r.value.postId : ""));
    expect(post?.body).toBe(LONG_TEXT);
  });
});

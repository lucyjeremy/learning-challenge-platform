// 서버 저장소. 규칙은 src/domain 의 순수 함수를 그대로 써요. 시각은 항상 인자로 받아요(테스트 가능).
// Supabase 키가 있으면 요청마다 DB에서 상태를 불러오고(server/db.ts), 바뀐 부분만 DB에 저장해요.
// 키가 없으면 메모리에만 두고, 서버를 다시 켜면 시드 상태로 돌아가요.

import { challenges, type Challenge, type DayStatus } from "@/lib/data";
import { addDays, deadline, dayDate, isEarly, isOpen, kstDateOf, kstMidnight, endDate as domainEnd } from "@/domain/day-calendar";
import { POINTS, CHALLENGE_LIMITS } from "@/domain/constants";
import { awardIfNew, levelOf, netForSource, rankLeaderboard, revokeIfAny, type PointLog } from "@/domain/points";
import { calculateStreak, expectedStreakBonuses, type DayRecord, type DayState } from "@/domain/streak";
import { validateProof, type ProofPayload, type ProofType } from "@/domain/validation";

export type Role = "student" | "instructor" | "admin";
export type User = { id: string; name: string; email: string; password: string; role: Role };
export type Enrollment = { id: string; challengeId: string; userId: string; status: "active" | "cancelled"; seeded?: boolean };
export type Submission = {
  id: string;
  enrollmentId: string;
  challengeId: string;
  userId: string;
  dayNo: number;
  body: string;
  linkUrl?: string;
  visibility: "public" | "private";
  status: "approved" | "pending";
  firstSubmittedAt: string; // ISO
  postId?: string;
};
export type StorePost = {
  id: string;
  challengeId: string;
  authorId: string;
  kind: "질문" | "자유" | "인증" | "공지";
  title?: string;
  body: string;
  editedAt?: string; // ISO, 수정했을 때만
  dayNo?: number;
  createdAt: string; // ISO
  likes: string[]; // 좋아요 누른 사용자 id
  comments: { id: string; authorId: string; body: string; createdAt: string }[];
  pinned?: boolean;
};
export type LedgerRow = PointLog & { userId: string; challengeId: string; at?: string /* DB에서 불러온 행만 시각이 있음 */ };

export type State = {
  users: User[];
  enrollments: Enrollment[];
  submissions: Submission[];
  posts: StorePost[];
  ledger: LedgerRow[];
};

// 데모 계정. 로컬 체험용이며 실제 서비스 계정이 아니에요.
export const DEMO_PASSWORD = "demo1234";

/** 데모 학생의 지난 기록(python-21 Day 1·2·4·5·6 인증, Day 3 놓침)을 실제 인증·점수로 넣어요. */
function seedHistory(): Pick<State, "submissions" | "ledger"> {
  const days = [1, 2, 4, 5, 6];
  const submissions: Submission[] = days.map((d) => ({
    id: `seed-sub-${d}`,
    enrollmentId: "seed-python",
    challengeId: "python-21",
    userId: "u-student",
    dayNo: d,
    body: "지난 Day 인증 (예시)",
    visibility: "private",
    status: "approved",
    firstSubmittedAt: new Date(`${dayDate("2026-11-19", d)}T12:00:00+09:00`).toISOString(),
  }));
  const ledger = submissions.flatMap((s) => [
    { sourceKey: `proof:${s.id}`, points: POINTS.PROOF, userId: "u-student", challengeId: "python-21" },
    { sourceKey: `early:${s.id}`, points: POINTS.EARLY, userId: "u-student", challengeId: "python-21" },
  ]);
  return { submissions, ledger };
}

function initial(withHistory = true): State {
  const history = withHistory ? seedHistory() : { submissions: [], ledger: [] };
  return {
    users: [
      { id: "u-student", name: "김지은", email: "student@demo.test", password: DEMO_PASSWORD, role: "student" },
      { id: "u-instructor", name: "박민호", email: "instructor@demo.test", password: DEMO_PASSWORD, role: "instructor" },
      { id: "u-admin", name: "운영팀", email: "admin@demo.test", password: DEMO_PASSWORD, role: "admin" },
    ],
    // 시드: 김지은은 python-21에 이미 참여 중 (lib/data.ts의 myEnrollments와 같음)
    enrollments: [{ id: "seed-python", challengeId: "python-21", userId: "u-student", status: "active", seeded: true }],
    submissions: history.submissions,
    posts: [],
    ledger: history.ledger,
  };
}

// 개발 서버가 다시 컴파일돼도 상태가 유지되도록 globalThis에 둬요.
const g = globalThis as unknown as { __cuStore?: State };
function state(): State {
  if (!g.__cuStore) g.__cuStore = initial();
  return g.__cuStore;
}

/** DB에 그대로 넣을 수 있도록 UUID로 만들어요. */
function nextId() {
  return crypto.randomUUID();
}

/** DB에서 불러온 상태로 바꿔요 (server/db.ts). */
export function replaceState(next: State) {
  g.__cuStore = next;
}

export function currentState(): State {
  return state();
}

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; message: string };
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (message: string): Result<never> => ({ ok: false, message });

// ───────── 조회 ─────────

/** 테스트 전용: 저장소를 시드 상태로 되돌린다. */
export function resetStoreForTest() {
  g.__cuStore = initial(false);
}

export function getUser(id: string | null | undefined): User | undefined {
  return id ? state().users.find((u) => u.id === id) : undefined;
}

export function getUserByEmail(email: string): User | undefined {
  return state().users.find((u) => u.email === email);
}

export function createUser(input: { email: string; password: string; name: string }): Result<{ id: string }> {
  if (getUserByEmail(input.email)) return fail("이미 가입한 이메일이에요. 로그인하거나 비밀번호를 찾아 주세요");
  const id = nextId();
  state().users.push({ id, name: input.name, email: input.email, password: input.password, role: "student" });
  return ok({ id });
}

export function findChallenge(id: string): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}

export type ChallengeState = "recruiting" | "in_progress" | "ended";

/** 오늘(KST) 기준 챌린지 상태. 모집 마감은 시작일 전날 23:59:59 = 시작일 전까지. */
export function stateOf(c: Challenge, now: Date): ChallengeState {
  const today = kstDateOf(now);
  if (today < c.startDate) return "recruiting";
  if (today <= domainEnd(c.startDate, c.days)) return "in_progress";
  return "ended";
}

export function activeEnrollment(userId: string, challengeId: string): Enrollment | undefined {
  return state().enrollments.find((e) => e.userId === userId && e.challengeId === challengeId && e.status === "active");
}

export function isMemberOf(userId: string | null | undefined, challengeId: string): boolean {
  return !!userId && !!activeEnrollment(userId, challengeId);
}

/** 신청 인원: 시드 인원(c.enrolled) + 저장소에서 새로 신청한 인원. */
export function enrolledCount(c: Challenge): number {
  const added = state().enrollments.filter((e) => e.challengeId === c.id && e.status === "active" && !e.seeded).length;
  return c.enrolled + added;
}

function activeCountFor(userId: string, now: Date): number {
  return state().enrollments.filter((e) => {
    if (e.userId !== userId || e.status !== "active") return false;
    const c = findChallenge(e.challengeId);
    return !!c && stateOf(c, now) !== "ended";
  }).length;
}

/** 내 챌린지의 Day별 인증 상태 (커리큘럼 표시용). */
export function myDayStates(userId: string, challengeId: string): Record<number, "인정" | "강사 확인 중" | "반려" | "놓침" | undefined> {
  const e = activeEnrollment(userId, challengeId);
  const out: Record<number, "인정" | "강사 확인 중" | "반려" | "놓침" | undefined> = {};
  if (!e) return out;
  for (const s of state().submissions.filter((x) => x.enrollmentId === e.id)) {
    out[s.dayNo] = s.status === "approved" ? "인정" : "강사 확인 중";
  }
  return out;
}

/** 화면용 Day 상태: 인증한 Day는 인정·확인 중, 마감이 지났는데 인증이 없으면 놓침. */
export function dayStatusesFor(userId: string | null, challengeId: string, now = new Date()): Record<number, DayStatus | "강사 확인 중" | "반려" | undefined> {
  const c = findChallenge(challengeId);
  if (!userId || !c || !activeEnrollment(userId, challengeId)) return {};
  const out: Record<number, DayStatus | "강사 확인 중" | "반려" | undefined> = { ...myDayStates(userId, challengeId) };
  for (let d = 1; d <= c.days; d++) {
    if (!out[d] && now.getTime() >= deadline(c.startDate, d).getTime()) out[d] = "놓침";
  }
  return out;
}

/** 이 인증으로 받은 점수 (인증 + 조기 보너스). */
export function submissionPoints(sub: Submission): number {
  const s = state();
  return netForSource(s.ledger, `proof:${sub.id}`) + netForSource(s.ledger, `early:${sub.id}`);
}

export function mySubmission(userId: string, challengeId: string, dayNo: number): Submission | undefined {
  const e = activeEnrollment(userId, challengeId);
  if (!e) return undefined;
  return state().submissions.find((s) => s.enrollmentId === e.id && s.dayNo === dayNo);
}

export function postsOf(challengeId: string): StorePost[] {
  return state().posts.filter((p) => p.challengeId === challengeId);
}

export function pointsOf(userId: string, challengeId?: string): number {
  return state()
    .ledger.filter((r) => r.userId === userId && (challengeId ? r.challengeId === challengeId : true))
    .reduce((sum, r) => sum + r.points, 0);
}

/** 그 챌린지의 강사인지 (강사 이름으로 연결, 시드 데이터 기준). */
export function isInstructorOf(userId: string | null | undefined, challengeId: string): boolean {
  const u = getUser(userId);
  const c = findChallenge(challengeId);
  return !!u && !!c && u.role === "instructor" && c.instructor.name === u.name;
}

export type BoardRow = { id: string; name: string; level: number; points: number; streak: number; me?: boolean };
export type Period = "7일" | "30일" | "전체";

/** 리더보드: 포인트 원장에서 기간별로 합산. 같은 점수는 먼저 도달한 사람이 위 (BP-POINT-004). */
export function leaderboardFor(challengeId: string, viewerId: string | null, now = new Date()): Record<Period, BoardRow[]> {
  const s = state();
  const members = s.enrollments.filter((e) => e.challengeId === challengeId && e.status === "active");
  const today = kstDateOf(now);
  const since = (days: number) => kstMidnight(addDays(today, -(days - 1))).getTime();
  const build = (from: number | null): BoardRow[] => {
    const rows = members.map((e) => {
      const logs = s.ledger.filter((r) => r.userId === e.userId && r.challengeId === challengeId && (from === null || !r.at || Date.parse(r.at) >= from));
      const last = logs.map((r) => (r.at ? Date.parse(r.at) : now.getTime())).sort((a, b) => b - a)[0];
      return { userId: e.userId, points: logs.reduce((sum, r) => sum + r.points, 0), lastChangedAt: last ? new Date(last) : null };
    });
    return rankLeaderboard(rows).map((r) => ({
      id: r.userId,
      name: getUser(r.userId)?.name ?? "알 수 없음",
      level: levelOf(pointsOf(r.userId)),
      points: r.points,
      streak: streakOf(r.userId, challengeId).current,
      me: r.userId === viewerId || undefined,
    }));
  };
  return { "7일": build(since(7)), "30일": build(since(30)), 전체: build(null) };
}

/** 오늘(KST) 그 Day를 인증한 참여자 수 / 참여자 수 */
export function todayCheckinsFor(challengeId: string, now = new Date()): { done: number; total: number } {
  const c = findChallenge(challengeId);
  const s = state();
  const members = s.enrollments.filter((e) => e.challengeId === challengeId && e.status === "active");
  if (!c) return { done: 0, total: members.length };
  const dayNo = Math.round((kstMidnight(kstDateOf(now)).getTime() - kstMidnight(c.startDate).getTime()) / 86400000) + 1;
  const done = members.filter((e) => s.submissions.some((x) => x.enrollmentId === e.id && x.dayNo === dayNo)).length;
  return { done, total: members.length };
}

export function streakOf(userId: string, challengeId: string): { current: number; longest: number } {
  const e = activeEnrollment(userId, challengeId);
  return e ? streakFor(e.id) : { current: 0, longest: 0 };
}

// ───────── 신청 ─────────

export function enroll(userId: string, challengeId: string, now: Date): Result<{ enrollmentId: string }> {
  const user = getUser(userId);
  if (!user) return fail("로그인하면 신청할 수 있어요");
  const c = findChallenge(challengeId);
  if (!c) return fail("찾을 수 없는 챌린지예요");
  if (stateOf(c, now) !== "recruiting") return fail("모집이 끝났어요. 지금 모집 중인 챌린지를 둘러볼까요?");
  if (c.instructor.name === user.name) return fail("내가 연 챌린지에는 신청할 수 없어요");
  if (activeEnrollment(userId, challengeId)) return fail("이미 신청한 챌린지예요");
  if (activeCountFor(userId, now) >= CHALLENGE_LIMITS.maxConcurrentEnrollments) {
    return fail("챌린지는 동시에 5개까지 참여할 수 있어요. 진행 중인 챌린지가 끝나면 다시 신청할 수 있어요");
  }
  if (enrolledCount(c) >= c.capacity) return fail("정원이 다 찼어요. 비슷한 챌린지를 둘러볼까요?");
  const id = nextId();
  state().enrollments.push({ id, challengeId, userId, status: "active" });
  return ok({ enrollmentId: id });
}

export function cancelEnrollment(userId: string, challengeId: string, now: Date): Result {
  const c = findChallenge(challengeId);
  const e = activeEnrollment(userId, challengeId);
  if (!c || !e) return fail("신청한 챌린지가 아니에요");
  if (kstDateOf(now) >= c.startDate) return fail("챌린지가 시작돼서 신청을 취소할 수 없어요. 인증하지 않은 Day는 미완주로 기록돼요");
  e.status = "cancelled";
  return ok(undefined);
}

// ───────── 인증 ─────────

const PROOF_TYPE: Record<Challenge["format"], ProofType> = { 텍스트: "text", 사진: "photo", 링크: "link", 체크: "check" };

/** 날짜별 스트릭 기록 (오늘까지 열린 Day만). */
function dayRecords(enrollmentId: string, c: Challenge, now: Date): DayRecord[] {
  const today = kstDateOf(now);
  const subs = state().submissions.filter((s) => s.enrollmentId === enrollmentId);
  const records: DayRecord[] = [];
  for (let d = 1; d <= c.days; d++) {
    if (dayDate(c.startDate, d) > today) break;
    const s = subs.find((x) => x.dayNo === d);
    const state: DayState = s ? (s.status === "approved" ? "approved" : "pending") : "none";
    records.push({ dayNo: d, state, deadline: deadline(c.startDate, d) });
  }
  return records;
}

/** 스트릭을 다시 계산하고, 연속 보상을 맞춘다 (맞으면 적립, 넘치면 회수). */
function streakFor(enrollmentId: string): { current: number; longest: number } {
  const e = state().enrollments.find((x) => x.id === enrollmentId);
  const c = e ? findChallenge(e.challengeId) : undefined;
  if (!e || !c) return { current: 0, longest: 0 };
  return recalcStreak(e, c, new Date());
}

function recalcStreak(e: Enrollment, c: Challenge, now: Date) {
  const result = calculateStreak(dayRecords(e.id, c, now), now);
  const s = state();
  const expected = expectedStreakBonuses(result.longest);
  const logs: PointLog[] = s.ledger.filter((r) => r.userId === e.userId);
  for (const b of expected) {
    const key = `streak:${e.id}:${b.milestone}`;
    const row = awardIfNew(logs, key, b.points);
    if (row) {
      s.ledger.push({ ...row, userId: e.userId, challengeId: c.id });
      logs.push(row);
    }
  }
  // 최장 스트릭이 줄었을 때 넘치는 보상 회수
  for (const key of [...new Set(logs.filter((r) => r.sourceKey.startsWith(`streak:${e.id}:`)).map((r) => r.sourceKey))]) {
    const milestone = Number(key.split(":")[2]);
    if (!expected.some((b) => b.milestone === milestone)) {
      const row = revokeIfAny(logs, key);
      if (row) {
        s.ledger.push({ ...row, userId: e.userId, challengeId: c.id });
        logs.push(row);
      }
    }
  }
  return result;
}

export type SubmitOutcome = { points: number; streak: number; status: "approved" | "pending"; postId?: string };

export function submitProof(
  userId: string,
  challengeId: string,
  dayNo: number,
  payload: ProofPayload & { visibility: "public" | "private" },
  now: Date,
): Result<SubmitOutcome> {
  const c = findChallenge(challengeId);
  const e = activeEnrollment(userId, challengeId);
  if (!c) return fail("찾을 수 없는 챌린지예요");
  if (!e) return fail("신청한 참여자만 인증할 수 있어요");
  if (stateOf(c, now) !== "in_progress") return fail("진행 중인 챌린지에서만 인증할 수 있어요");
  if (dayNo < 1 || dayNo > c.days) return fail("없는 Day예요");
  const timing = { startDate: c.startDate, durationDays: c.days, unlockMode: "daily" as const };
  if (!isOpen(timing, dayNo, now)) return fail("아직 열리지 않은 Day예요");
  if (now.getTime() >= deadline(c.startDate, dayNo).getTime()) return fail("아쉽지만 인증 마감(23:59)이 지났어요");
  if (mySubmission(userId, challengeId, dayNo)) return fail("이 Day는 이미 인증했어요. 내용을 고칠까요?");

  const problems = validateProof(PROOF_TYPE[c.format], payload);
  if (problems.length > 0) return fail(problems[0].message);

  const s = state();
  const id = nextId();
  const status: "approved" | "pending" = c.approval === "자동 인정" ? "approved" : "pending";
  const sub: Submission = {
    id,
    enrollmentId: e.id,
    challengeId,
    userId,
    dayNo,
    body: payload.body?.trim() ?? "",
    linkUrl: payload.linkUrl,
    visibility: payload.visibility,
    status,
    firstSubmittedAt: now.toISOString(),
  };
  s.submissions.push(sub);

  let postId: string | undefined;
  if (payload.visibility === "public") {
    postId = nextId();
    s.posts.push({
      id: postId,
      challengeId,
      authorId: userId,
      kind: "인증",
      body: sub.body || (sub.linkUrl ?? "체크 인증"),
      dayNo,
      createdAt: now.toISOString(),
      likes: [],
      comments: [],
    });
    sub.postId = postId;
  }

  let points = 0;
  if (status === "approved") {
    const logs = s.ledger.filter((r) => r.userId === userId);
    const proof = awardIfNew(logs, `proof:${id}`, POINTS.PROOF);
    if (proof) s.ledger.push({ ...proof, userId, challengeId });
    points += POINTS.PROOF;
    if (isEarly(now, c.startDate, dayNo)) {
      const early = awardIfNew(s.ledger.filter((r) => r.userId === userId), `early:${id}`, POINTS.EARLY);
      if (early) s.ledger.push({ ...early, userId, challengeId });
      points += POINTS.EARLY;
    }
  }
  const streak = recalcStreak(e, c, now);
  return ok({ points, streak: streak.current, status, postId });
}

// ───────── 피드 ─────────

function checkPostText(title: string | undefined, body: string): string | null {
  if (title !== undefined && (title.trim().length < 1 || title.trim().length > 60)) return "제목은 1자 이상 60자 이하로 써 주세요";
  const len = body.trim().length;
  if (len < 1 || len > 2000) return "글은 1자 이상 2,000자 이하로 써 주세요";
  return null;
}

export function createPost(
  userId: string,
  challengeId: string,
  kind: "질문" | "자유" | "공지",
  body: string,
  now: Date,
  opts: { pinned?: boolean; title?: string } = {},
): Result<string> {
  const c = findChallenge(challengeId);
  const user = getUser(userId);
  if (!c || !user) return fail("로그인하면 글을 쓸 수 있어요");
  if (stateOf(c, now) === "ended") return fail("끝난 챌린지예요. 지난 글은 계속 볼 수 있어요");
  const isInstructor = user.role === "instructor" && c.instructor.name === user.name;
  if (kind === "공지" && !isInstructor) return fail("공지는 강사만 올릴 수 있어요");
  if (kind !== "공지" && !isMemberOf(userId, challengeId) && !isInstructor) return fail("신청한 참여자만 글을 쓸 수 있어요");
  const problem = checkPostText(opts.title, body);
  if (problem) return fail(problem);
  const id = nextId();
  state().posts.push({
    id,
    challengeId,
    authorId: userId,
    kind,
    title: opts.title?.trim(),
    body: body.trim(),
    createdAt: now.toISOString(),
    likes: [],
    comments: [],
    pinned: opts.pinned || undefined,
  });
  return ok(id);
}

/** 글 수정: 작성자만, 끝난 챌린지 제외. 인증 글은 인증 화면에서 고쳐요. */
export function editPost(
  userId: string,
  postId: string,
  input: { kind: "질문" | "자유"; title?: string; body: string },
  now: Date,
): Result {
  const post = state().posts.find((p) => p.id === postId);
  if (!post) return fail("글을 찾을 수 없어요");
  if (post.authorId !== userId) return fail("내가 쓴 글만 고칠 수 있어요");
  if (post.kind === "인증") return fail("인증 글은 Day 화면에서 고칠 수 있어요");
  const c = findChallenge(post.challengeId);
  if (c && stateOf(c, now) === "ended") return fail("끝난 챌린지의 글은 고칠 수 없어요");
  const problem = checkPostText(input.title, input.body);
  if (problem) return fail(problem);
  if (post.kind !== "공지") post.kind = input.kind;
  post.title = input.title?.trim();
  post.body = input.body.trim();
  post.editedAt = now.toISOString();
  return ok(undefined);
}

/** 글 삭제: 작성자 또는 그 챌린지 강사. 이 글로 받은 좋아요·댓글 점수는 회수해요 (BP-POINT-003). */
export function deletePost(userId: string, postId: string): Result {
  const s = state();
  const post = s.posts.find((p) => p.id === postId);
  if (!post) return fail("이미 삭제된 글이에요");
  const user = getUser(userId);
  const c = findChallenge(post.challengeId);
  const isInstructor = !!user && !!c && user.role === "instructor" && c.instructor.name === user.name;
  if (post.authorId !== userId && !isInstructor) return fail("내가 쓴 글만 삭제할 수 있어요");
  if (post.kind === "인증") return fail("인증 글은 Day 화면에서 관리해요");
  const keys = new Set([
    ...s.ledger.filter((r) => r.sourceKey.startsWith(`like:${postId}:`)).map((r) => r.sourceKey),
    ...post.comments.flatMap((cm) => s.ledger.filter((r) => r.sourceKey.startsWith(`comment:${cm.id}:`)).map((r) => r.sourceKey)),
  ]);
  for (const key of keys) {
    const owner = s.ledger.find((r) => r.sourceKey === key)!;
    const row = revokeIfAny(s.ledger.filter((r) => r.userId === owner.userId), key);
    if (row) s.ledger.push({ ...row, userId: owner.userId, challengeId: post.challengeId });
  }
  s.posts = s.posts.filter((p) => p.id !== postId);
  return ok(undefined);
}

export function toggleLike(userId: string, postId: string): Result<{ liked: boolean; count: number }> {
  const post = state().posts.find((p) => p.id === postId);
  if (!post) return fail("글을 찾을 수 없어요");
  if (!isMemberOf(userId, post.challengeId)) return fail("신청한 참여자만 좋아요를 누를 수 있어요");
  const s = state();
  const key = `like:${postId}:${userId}`;
  const liked = post.likes.includes(userId);
  if (liked) {
    post.likes = post.likes.filter((u) => u !== userId);
    const row = revokeIfAny(s.ledger.filter((r) => r.userId === post.authorId), key);
    if (row) s.ledger.push({ ...row, userId: post.authorId, challengeId: post.challengeId });
  } else {
    post.likes.push(userId);
    if (post.authorId !== userId) {
      const row = awardIfNew(s.ledger.filter((r) => r.userId === post.authorId), key, POINTS.LIKE);
      if (row) s.ledger.push({ ...row, userId: post.authorId, challengeId: post.challengeId });
    }
  }
  return ok({ liked: !liked, count: post.likes.length });
}

export function addComment(userId: string, postId: string, body: string, now: Date): Result<string> {
  const post = state().posts.find((p) => p.id === postId);
  if (!post) return fail("글을 찾을 수 없어요");
  if (!isMemberOf(userId, post.challengeId)) return fail("신청한 참여자만 댓글을 쓸 수 있어요");
  const c = findChallenge(post.challengeId);
  if (c && stateOf(c, now) === "ended") return fail("끝난 챌린지예요. 지난 글은 계속 볼 수 있어요");
  const text = body.trim();
  if (text.length < 1 || text.length > 500) return fail("댓글은 1자 이상 500자 이하로 써 주세요");
  const id = nextId();
  post.comments.push({ id, authorId: userId, body: text, createdAt: now.toISOString() });
  // 댓글 적립: 본인 글 제외, 하루 최대 5개 (BP-POINT-001)
  if (post.authorId !== userId) {
    const s = state();
    const today = kstDateOf(now);
    const todayCount = s.ledger.filter(
      (r) => r.userId === userId && r.sourceKey.startsWith("comment:") && r.points > 0 && r.sourceKey.endsWith(`:${today}`),
    ).length;
    if (todayCount < POINTS.COMMENT_DAILY_LIMIT) {
      const key = `comment:${id}:${today}`;
      if (netForSource(s.ledger, key) <= 0) s.ledger.push({ sourceKey: key, points: POINTS.COMMENT, userId, challengeId: post.challengeId });
    }
  }
  return ok(id);
}

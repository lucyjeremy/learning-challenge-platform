// Supabase 연결. 서버에서만 쓴다(service_role 키). 브라우저에는 절대 넘기지 않는다.
// 요청마다 DB에서 저장소 상태를 불러오고(loadState), 규칙을 실행한 뒤 바뀐 부분만 저장한다(persist).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Enrollment, LedgerRow, State, StorePost, Submission, User } from "./store";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const dbEnabled = !!URL && !!SERVICE_KEY;

let client: SupabaseClient | null = null;
export function adminDb(): SupabaseClient {
  if (!dbEnabled) throw new Error("Supabase 환경 변수가 없어요");
  client ??= createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

const KIND_TO_TYPE = { 인증: "proof", 질문: "question", 자유: "free", 공지: "notice" } as const;
const TYPE_TO_KIND = { proof: "인증", question: "질문", free: "자유", notice: "공지" } as const;

/** 챌린지 slug(화면 주소) ↔ DB uuid, (챌린지, Day) → mission uuid */
type Maps = { slugById: Map<string, string>; idBySlug: Map<string, string>; mission: Map<string, string> };
let maps: Maps | null = null;

async function loadMaps(db: SupabaseClient): Promise<Maps> {
  if (maps) return maps;
  const [{ data: cs, error: e1 }, { data: ms, error: e2 }] = await Promise.all([
    db.from("challenges").select("id, slug"),
    db.from("missions").select("id, challenge_id, day_no"),
  ]);
  if (e1 || e2) throw new Error((e1 ?? e2)!.message);
  const slugById = new Map(cs!.map((c) => [c.id as string, c.slug as string]));
  maps = {
    slugById,
    idBySlug: new Map(cs!.map((c) => [c.slug as string, c.id as string])),
    mission: new Map(ms!.map((m) => [`${slugById.get(m.challenge_id)}:${m.day_no}`, m.id as string])),
  };
  return maps;
}

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function loadState(): Promise<State> {
  const db = adminDb();
  const m = await loadMaps(db);
  const [profiles, enrollments, submissions, posts, likes, comments, logs] = await Promise.all([
    db.from("profiles").select("id, name, role"),
    db.from("enrollments").select("id, challenge_id, user_id, status, seeded"),
    db.from("submissions").select("id, enrollment_id, challenge_id, user_id, day_no, body, link_url, visibility, status, first_submitted_at"),
    db.from("posts").select("id, challenge_id, author_id, type, title, body, submission_id, pinned_at, edited_at, created_at").is("hidden_at", null).order("created_at"),
    db.from("likes").select("post_id, user_id"),
    db.from("comments").select("id, post_id, author_id, body, created_at").is("hidden_at", null).order("created_at"),
    db.from("point_logs").select("user_id, challenge_id, points, source_key, created_at").order("created_at").order("id"),
  ]);
  const slug = (id: string) => m.slugById.get(id) ?? id;

  const users: User[] = check(profiles).map((p) => ({ id: p.id, name: p.name, email: "", password: "", role: p.role }));
  const enr: Enrollment[] = check(enrollments).map((e) => ({
    id: e.id,
    challengeId: slug(e.challenge_id),
    userId: e.user_id,
    status: e.status === "active" ? "active" : "cancelled",
    seeded: e.seeded || undefined,
  }));
  const postRows = check(posts);
  const subs: Submission[] = check(submissions).map((s) => ({
    id: s.id,
    enrollmentId: s.enrollment_id,
    challengeId: slug(s.challenge_id),
    userId: s.user_id,
    dayNo: s.day_no,
    body: s.body ?? "",
    linkUrl: s.link_url ?? undefined,
    visibility: s.visibility,
    status: s.status === "approved" ? "approved" : "pending",
    firstSubmittedAt: s.first_submitted_at,
    postId: postRows.find((p) => p.submission_id === s.id)?.id,
  }));
  const likeRows = check(likes);
  const commentRows = check(comments);
  const storePosts: StorePost[] = postRows.map((p) => ({
    id: p.id,
    challengeId: slug(p.challenge_id),
    authorId: p.author_id,
    kind: TYPE_TO_KIND[p.type as keyof typeof TYPE_TO_KIND],
    title: p.title ?? undefined,
    body: p.body ?? "",
    editedAt: p.edited_at ?? undefined,
    dayNo: subs.find((s) => s.id === p.submission_id)?.dayNo,
    createdAt: p.created_at,
    likes: likeRows.filter((l) => l.post_id === p.id).map((l) => l.user_id),
    comments: commentRows
      .filter((c) => c.post_id === p.id)
      .map((c) => ({ id: c.id, authorId: c.author_id, body: c.body, createdAt: c.created_at })),
    pinned: p.pinned_at ? true : undefined,
  }));
  const ledger: LedgerRow[] = check(logs).map((l) => ({
    userId: l.user_id,
    challengeId: l.challenge_id ? slug(l.challenge_id) : "",
    points: l.points,
    sourceKey: l.source_key,
    at: l.created_at,
  }));
  return { users, enrollments: enr, submissions: subs, posts: storePosts, ledger };
}

function reasonOf(sourceKey: string, points: number) {
  if (points < 0) return "revoke";
  const prefix = sourceKey.split(":")[0];
  return (
    { proof: "proof_approved", early: "early_bonus", like: "like_received", comment: "comment_written", streak: "streak_bonus" } as const
  )[prefix as "proof"] ?? "revoke";
}

/** 규칙 실행 전(before)과 후(after)를 비교해 바뀐 부분만 DB에 쓴다. 순서: 부모 → 자식. */
export async function persist(before: State, after: State): Promise<void> {
  const db = adminDb();
  const m = await loadMaps(db);
  const cid = (slug: string) => m.idBySlug.get(slug)!;

  // 신청: 새로 생긴 것 넣기, 상태 바뀐 것 고치기
  const oldEnr = new Map(before.enrollments.map((e) => [e.id, e]));
  const newEnr = after.enrollments.filter((e) => !oldEnr.has(e.id));
  if (newEnr.length) {
    check(await db.from("enrollments").insert(newEnr.map((e) => ({ id: e.id, challenge_id: cid(e.challengeId), user_id: e.userId, status: e.status }))));
  }
  for (const e of after.enrollments) {
    const prev = oldEnr.get(e.id);
    if (prev && prev.status !== e.status) {
      check(
        await db
          .from("enrollments")
          .update({ status: e.status, cancelled_at: e.status === "cancelled" ? new Date().toISOString() : null })
          .eq("id", e.id),
      );
    }
  }

  // 인증: 새로 생긴 것만 (수정·삭제는 아직 화면에 없음)
  const oldSub = new Set(before.submissions.map((s) => s.id));
  const newSubs = after.submissions.filter((s) => !oldSub.has(s.id));
  if (newSubs.length) {
    check(
      await db.from("submissions").insert(
        newSubs.map((s) => ({
          id: s.id,
          enrollment_id: s.enrollmentId,
          mission_id: m.mission.get(`${s.challengeId}:${s.dayNo}`),
          challenge_id: cid(s.challengeId),
          user_id: s.userId,
          day_no: s.dayNo,
          body: s.body || null,
          link_url: s.linkUrl ?? null,
          visibility: s.visibility,
          status: s.status,
          first_submitted_at: s.firstSubmittedAt,
        })),
      ),
    );
  }

  // 글: 새 글 넣기, 고친 글 반영, 지운 글 삭제, 좋아요·댓글 차이 반영
  const oldPosts = new Map(before.posts.map((p) => [p.id, p]));
  const newPosts = after.posts.filter((p) => !oldPosts.has(p.id));
  if (newPosts.length) {
    check(
      await db.from("posts").insert(
        newPosts.map((p) => ({
          id: p.id,
          challenge_id: cid(p.challengeId),
          author_id: p.authorId,
          type: KIND_TO_TYPE[p.kind],
          title: p.title ?? null,
          body: p.body,
          submission_id: after.submissions.find((s) => s.postId === p.id)?.id ?? null,
          pinned_at: p.pinned ? p.createdAt : null,
          created_at: p.createdAt,
        })),
      ),
    );
  }
  const afterIds = new Set(after.posts.map((p) => p.id));
  const removed = before.posts.filter((p) => !afterIds.has(p.id)).map((p) => p.id);
  if (removed.length) check(await db.from("posts").delete().in("id", removed));

  for (const p of after.posts) {
    const prev = oldPosts.get(p.id);
    if (prev && (prev.kind !== p.kind || prev.title !== p.title || prev.body !== p.body || prev.editedAt !== p.editedAt)) {
      check(await db.from("posts").update({ type: KIND_TO_TYPE[p.kind], title: p.title ?? null, body: p.body, edited_at: p.editedAt ?? null }).eq("id", p.id));
    }
    const prevLikes = new Set(prev?.likes ?? []);
    const nowLikes = new Set(p.likes);
    const addLikes = p.likes.filter((u) => !prevLikes.has(u));
    const delLikes = [...prevLikes].filter((u) => !nowLikes.has(u));
    if (addLikes.length) check(await db.from("likes").insert(addLikes.map((u) => ({ post_id: p.id, user_id: u }))));
    if (delLikes.length) check(await db.from("likes").delete().eq("post_id", p.id).in("user_id", delLikes));
    const prevComments = new Set((prev?.comments ?? []).map((c) => c.id));
    const addComments = p.comments.filter((c) => !prevComments.has(c.id));
    if (addComments.length) {
      check(
        await db
          .from("comments")
          .insert(addComments.map((c) => ({ id: c.id, post_id: p.id, author_id: c.authorId, body: c.body, created_at: c.createdAt }))),
      );
    }
  }

  // 포인트 원장: 추가 전용이라 뒤에 붙은 행만 넣는다. 같은 원인의 몇 번째 행인지로 멱등 키를 만든다.
  const added = after.ledger.slice(before.ledger.length);
  if (added.length) {
    const seen = new Map<string, number>();
    for (const r of before.ledger) seen.set(r.sourceKey, (seen.get(r.sourceKey) ?? 0) + 1);
    const rows = added.map((r) => {
      const n = seen.get(r.sourceKey) ?? 0;
      seen.set(r.sourceKey, n + 1);
      return {
        user_id: r.userId,
        challenge_id: r.challengeId ? cid(r.challengeId) : null,
        reason: reasonOf(r.sourceKey, r.points),
        points: r.points,
        source_key: r.sourceKey,
        idempotency_key: `${r.sourceKey}:${n}`,
      };
    });
    check(await db.from("point_logs").insert(rows));
  }
}

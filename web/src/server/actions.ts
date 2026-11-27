"use server";

// 서버 액션. 화면에서 직접 호출해요.
// Supabase 키가 있으면 Supabase Auth 세션과 DB를 쓰고, 없으면 메모리 저장소와 데모 쿠키 세션을 써요.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByEmail, createUser, enroll, cancelEnrollment, submitProof, createPost, editPost, deletePost, toggleLike, addComment, type Result, type SubmitOutcome } from "./store";
import { signupProblem, type ProofPayload } from "@/domain/validation";
import { adminDb, dbEnabled } from "./db";
import { authClient, DEMO_SESSION, mutate, sessionUserId } from "./session";

const BAD_LOGIN = "이메일이나 비밀번호가 맞지 않아요";

export async function currentUserId(): Promise<string | null> {
  return sessionUserId();
}

async function setDemoSession(userId: string) {
  (await cookies()).set(DEMO_SESSION, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function logoutAction(): Promise<void> {
  if (dbEnabled) await (await authClient()).auth.signOut();
  (await cookies()).delete(DEMO_SESSION);
  redirect("/");
}

export async function loginAction(email: string, password: string): Promise<Result<{ name: string }>> {
  if (typeof email !== "string" || typeof password !== "string") return { ok: false, message: BAD_LOGIN };
  const addr = email.trim().toLowerCase();
  if (dbEnabled) {
    const { data, error } = await (await authClient()).auth.signInWithPassword({ email: addr, password });
    if (error || !data.user) return { ok: false, message: BAD_LOGIN };
    const { data: profile } = await adminDb().from("profiles").select("name").eq("id", data.user.id).maybeSingle();
    return { ok: true, value: { name: profile?.name ?? "" } };
  }
  const user = getUserByEmail(addr);
  if (!user || user.password !== password) return { ok: false, message: BAD_LOGIN };
  await setDemoSession(user.id);
  return { ok: true, value: { name: user.name } };
}

export async function signupAction(input: {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  agreed: boolean;
}): Promise<Result<{ name: string }>> {
  // 서버 액션은 화면을 거치지 않고도 호출될 수 있어서, 타입부터 다시 검사해요.
  const problem = signupProblem(input);
  if (problem) return { ok: false, message: problem };
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (dbEnabled) {
    const db = adminDb();
    // 이메일 인증 메일 발송은 아직 연결하지 않아서, 가입과 동시에 확인된 계정으로 만들어요.
    const { data, error } = await db.auth.admin.createUser({ email, password: input.password, email_confirm: true });
    if (error || !data.user) {
      const dup = /already|registered|exists/i.test(error?.message ?? "");
      return { ok: false, message: dup ? "이미 가입한 이메일이에요. 로그인하거나 비밀번호를 찾아 주세요" : "가입하지 못했어요. 잠시 뒤 다시 해 주세요" };
    }
    const { error: pe } = await db.from("profiles").insert({ id: data.user.id, name, role: "student", terms_agreed_at: new Date().toISOString() });
    if (pe) {
      await db.auth.admin.deleteUser(data.user.id);
      return { ok: false, message: "가입하지 못했어요. 잠시 뒤 다시 해 주세요" };
    }
    await (await authClient()).auth.signInWithPassword({ email, password: input.password });
    return { ok: true, value: { name } };
  }
  const created = createUser({ email, password: input.password, name });
  if (!created.ok) return created;
  await setDemoSession(created.value.id);
  return { ok: true, value: { name } };
}

export async function enrollAction(challengeId: string): Promise<Result<{ enrollmentId: string }>> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, message: "로그인하면 신청할 수 있어요" };
  return mutate(() => enroll(uid, challengeId, new Date()));
}

export async function cancelEnrollmentAction(challengeId: string): Promise<Result> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, message: "로그인이 필요해요" };
  return mutate(() => cancelEnrollment(uid, challengeId, new Date()));
}

export async function submitProofAction(
  challengeId: string,
  dayNo: number,
  payload: ProofPayload & { visibility: "public" | "private" },
): Promise<Result<SubmitOutcome>> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, message: "로그인이 필요해요" };
  return mutate(() => submitProof(uid, challengeId, dayNo, payload, new Date()));
}

export type PostInput = { kind: "질문" | "자유"; title: string; body: string };

/** postId: 글쓰기 창을 열 때 정한 id. 재시도해도 같은 id라 글이 한 번만 생겨요. */
export async function createPostAction(challengeId: string, input: PostInput, postId?: string): Promise<Result<string>> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, message: "로그인이 필요해요" };
  return mutate(() => createPost(uid, challengeId, input.kind, input.body, new Date(), { title: input.title, id: postId }));
}

export async function editPostAction(postId: string, input: PostInput): Promise<Result> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, message: "로그인이 필요해요" };
  return mutate(() => editPost(uid, postId, input, new Date()));
}

export async function deletePostAction(postId: string): Promise<Result> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, message: "로그인이 필요해요" };
  return mutate(() => deletePost(uid, postId));
}

export async function toggleLikeAction(postId: string): Promise<Result<{ liked: boolean; count: number }>> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, message: "로그인이 필요해요" };
  return mutate(() => toggleLike(uid, postId));
}

export async function addCommentAction(postId: string, body: string): Promise<Result<string>> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, message: "로그인이 필요해요" };
  return mutate(() => addComment(uid, postId, body, new Date()));
}

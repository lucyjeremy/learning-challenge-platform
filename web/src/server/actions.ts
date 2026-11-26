"use server";

// 서버 액션. 화면에서 직접 호출해요. 세션은 HttpOnly 쿠키에 사용자 id를 담아요.
// 주의: 데모용 세션이에요. 실제 서비스에서는 Supabase Auth 같은 검증된 세션을 써야 해요.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser, getUserByEmail, createUser, enroll, cancelEnrollment, submitProof, createPost, editPost, deletePost, toggleLike, addComment, type Result, type SubmitOutcome } from "./store";
import { signupProblem, type ProofPayload } from "@/domain/validation";

const SESSION = "cu-session";

export async function currentUserId(): Promise<string | null> {
  const c = await cookies();
  const id = c.get(SESSION)?.value ?? null;
  return getUser(id) ? id : null;
}

async function setSession(userId: string) {
  const c = await cookies();
  c.set(SESSION, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function logoutAction(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION);
  redirect("/");
}

export async function loginAction(email: string, password: string): Promise<Result<{ name: string }>> {
  if (typeof email !== "string" || typeof password !== "string") {
    return { ok: false, message: "이메일이나 비밀번호가 맞지 않아요" };
  }
  const user = getUserByEmail(email.trim().toLowerCase());
  if (!user || user.password !== password) {
    return { ok: false, message: "이메일이나 비밀번호가 맞지 않아요" };
  }
  await setSession(user.id);
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
  const created = createUser({ email: input.email.trim().toLowerCase(), password: input.password, name });
  if (!created.ok) return created;
  await setSession(created.value.id);
  return { ok: true, value: { name } };
}

async function requireUser(): Promise<string | null> {
  return currentUserId();
}

export async function enrollAction(challengeId: string): Promise<Result<{ enrollmentId: string }>> {
  const uid = await requireUser();
  if (!uid) return { ok: false, message: "로그인하면 신청할 수 있어요." };
  return enroll(uid, challengeId, new Date());
}

export async function cancelEnrollmentAction(challengeId: string): Promise<Result> {
  const uid = await requireUser();
  if (!uid) return { ok: false, message: "로그인이 필요해요." };
  return cancelEnrollment(uid, challengeId, new Date());
}

export async function submitProofAction(
  challengeId: string,
  dayNo: number,
  payload: ProofPayload & { visibility: "public" | "private" },
): Promise<Result<SubmitOutcome>> {
  const uid = await requireUser();
  if (!uid) return { ok: false, message: "로그인이 필요해요." };
  return submitProof(uid, challengeId, dayNo, payload, new Date());
}

export type PostInput = { kind: "질문" | "자유"; title: string; body: string };

export async function createPostAction(challengeId: string, input: PostInput): Promise<Result<string>> {
  const uid = await requireUser();
  if (!uid) return { ok: false, message: "로그인이 필요해요." };
  return createPost(uid, challengeId, input.kind, input.body, new Date(), { title: input.title });
}

export async function editPostAction(postId: string, input: PostInput): Promise<Result> {
  const uid = await requireUser();
  if (!uid) return { ok: false, message: "로그인이 필요해요." };
  return editPost(uid, postId, input, new Date());
}

export async function deletePostAction(postId: string): Promise<Result> {
  const uid = await requireUser();
  if (!uid) return { ok: false, message: "로그인이 필요해요." };
  return deletePost(uid, postId);
}

export async function toggleLikeAction(postId: string): Promise<Result<{ liked: boolean; count: number }>> {
  const uid = await requireUser();
  if (!uid) return { ok: false, message: "로그인이 필요해요." };
  return toggleLike(uid, postId);
}

export async function addCommentAction(postId: string, body: string): Promise<Result<string>> {
  const uid = await requireUser();
  if (!uid) return { ok: false, message: "로그인이 필요해요." };
  return addComment(uid, postId, body, new Date());
}


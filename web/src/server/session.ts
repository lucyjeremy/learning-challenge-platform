// 요청 단위 준비: DB 상태 불러오기, 로그인 사용자 확인, 변경 저장.
// Supabase 키가 없으면 예전처럼 메모리 저장소와 데모 쿠키 세션을 쓴다.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { dbEnabled, loadState, persist } from "./db";
import { currentState, getUser, replaceState, type Result } from "./store";

export const DEMO_SESSION = "cu-session";

/** 한 요청 안에서는 한 번만 DB에서 불러온다. */
export const loadStore = cache(async () => {
  if (dbEnabled) replaceState(await loadState());
});

/** Supabase Auth 세션(쿠키)을 다루는 클라이언트. 데이터 조회에는 쓰지 않는다. */
export async function authClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없어요. 세션 갱신은 다음 서버 액션에서 반영돼요.
        }
      },
    },
  });
}

export const sessionUserId = cache(async (): Promise<string | null> => {
  await loadStore();
  if (dbEnabled) {
    const { data } = await (await authClient()).auth.getUser();
    const id = data.user?.id ?? null;
    return getUser(id) ? id : null;
  }
  const id = (await cookies()).get(DEMO_SESSION)?.value ?? null;
  return getUser(id) ? id : null;
});

/** 규칙을 최신 DB 상태에서 실행하고, 성공하면 바뀐 부분을 저장한다. */
export async function mutate<T>(run: () => Result<T>): Promise<Result<T>> {
  if (!dbEnabled) return run();
  const fresh = await loadState();
  replaceState(fresh);
  const before = structuredClone(fresh);
  const result = run();
  if (!result.ok) return result;
  try {
    await persist(before, currentState());
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    // DB가 마지막에 한 번 더 막은 경우 (동시 요청): 정원 초과, 중복 신청
    if (msg.includes("CAPACITY_FULL")) return { ok: false, message: "정원이 다 찼어요. 비슷한 챌린지를 둘러볼까요?" };
    if (msg.includes("one_active_enrollment")) return { ok: false, message: "이미 신청한 챌린지예요" };
    console.error("DB 저장 실패", e);
    return { ok: false, message: "저장하지 못했어요. 잠시 뒤 다시 해 주세요" };
  }
  return result;
}

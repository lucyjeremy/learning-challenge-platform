/**
 * 서버 액션 요청 자체가 실패해도(연결 끊김·서버 오류) 화면이 오류 페이지로 바뀌지 않게,
 * 실패를 일반 실패 결과로 바꿔 돌려줘요. 폼은 입력을 그대로 두고 안내만 보여 주면 돼요.
 */
export async function safeAction<T>(call: Promise<T>): Promise<T | { ok: false; message: string }> {
  try {
    return await call;
  } catch {
    return { ok: false, message: "연결이 불안정해서 보내지 못했어요. 쓴 내용은 그대로 있으니 다시 시도해 주세요" };
  }
}

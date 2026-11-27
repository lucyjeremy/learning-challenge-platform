// 그로블 결제 웹훅 수신. 결제 완료 → 구매자 이메일로 회원을 찾아 연결된 챌린지에 신청을 만든다.
// 같은 이벤트는 한 번만 처리하고(기록을 먼저 넣어 동시 재전송도 막음), 처리할 수 없는 경우도 기록한 뒤 200을 돌려준다.
// 금액·통화가 이상하거나 취소·환불이면 신청을 바꾸지 않고 review:로 남겨 사람이 확인한다.

import { adminDb, dbEnabled } from "@/server/db";
import { planGroble, verifyGroble, type GrobleEvent } from "@/server/groble";
import { mutate } from "@/server/session";
import { enroll } from "@/server/store";

export async function POST(req: Request) {
  const secret = process.env.GROBLE_WEBHOOK_SECRET;
  if (!secret || !dbEnabled) return Response.json({ error: "웹훅이 설정되지 않았어요" }, { status: 503 });

  const raw = await req.text();
  const problem = verifyGroble(
    secret,
    { signature: req.headers.get("x-groble-signature"), timestamp: req.headers.get("x-groble-timestamp") },
    raw,
    Math.floor(Date.now() / 1000),
  );
  if (problem) return Response.json({ error: problem }, { status: 401 });

  let event: GrobleEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "본문이 JSON이 아니에요" }, { status: 400 });
  }
  const id = req.headers.get("x-groble-idempotency-key") ?? event.id;
  const db = adminDb();

  // 먼저 기록부터 넣어요. 같은 이벤트가 동시에 와도 기본키 충돌로 하나만 통과해요
  const claim = await db.from("webhook_events").insert({ id, type: event.type, result: "processing", payload: event });
  if (claim.error) {
    if (claim.error.code !== "23505") return Response.json({ error: "기록하지 못했어요" }, { status: 500 });
    const { data: seen } = await db.from("webhook_events").select("result").eq("id", id).maybeSingle();
    return Response.json({ ok: true, duplicate: true, result: seen?.result });
  }

  let result: string;
  try {
    result = await handle(event);
  } catch (e) {
    result = `failed:${e instanceof Error ? e.message : "처리 중 오류"}`;
    console.error("[groble]", id, e);
  }
  await db.from("webhook_events").update({ result }).eq("id", id);
  return Response.json({ ok: true, result });
}

async function handle(event: GrobleEvent): Promise<string> {
  const plan = planGroble(event);
  if (plan.action === "record") return plan.result;
  const { email, contentId } = plan;
  const db = adminDb();

  const { data: challenge } = await db.from("challenges").select("slug").eq("groble_content_id", contentId).maybeSingle();
  if (!challenge) return "unmapped_product";

  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const user = users?.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) return "unknown_buyer";

  const r = await mutate(() => enroll(user.id, challenge.slug, new Date()));
  if (r.ok) return "enrolled";
  if (r.message.startsWith("이미 신청한")) return "already_enrolled";
  return `failed:${r.message}`;
}

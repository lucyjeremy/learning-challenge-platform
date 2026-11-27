// 그로블 결제 웹훅. 서명: HMAC-SHA256(키 = 웹훅 비밀키 전체 문자열, 내용 = "타임스탬프.원본본문"), 16진수.
// 헤더: x-groble-signature, x-groble-timestamp(초), x-groble-idempotency-key(이벤트 id).

import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_SKEW_SECONDS = 5 * 60;

export type GrobleEvent = {
  id: string;
  type: string; // payment.completed, payment.cancel_requested ...
  occurredAt: string;
  data: {
    object: {
      merchantUid?: string;
      buyer?: { email?: string; displayName?: string };
      content?: { id?: string; title?: string };
      pricing?: { finalAmount?: number; currency?: string };
    };
  };
};

export function grobleSignature(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

/** 서명과 시각을 확인한다. 문제가 없으면 null, 있으면 사유. */
export function verifyGroble(
  secret: string,
  headers: { signature: string | null; timestamp: string | null },
  rawBody: string,
  nowSeconds: number,
): string | null {
  const { signature, timestamp } = headers;
  if (!signature || !timestamp || !/^\d+$/.test(timestamp)) return "서명 헤더가 없어요";
  if (Math.abs(nowSeconds - Number(timestamp)) > MAX_SKEW_SECONDS) return "요청 시각이 5분 넘게 차이 나요";
  const expected = Buffer.from(grobleSignature(secret, timestamp, rawBody), "hex");
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return "서명이 맞지 않아요";
  return null;
}

/** 웹훅 이벤트로 할 일을 정한다. DB를 건드리지 않는 판단만 해서 단위 테스트로 확인한다. */
export type GroblePlan =
  | { action: "enroll"; email: string; contentId: string }
  | { action: "record"; result: string };

export function planGroble(event: GrobleEvent): GroblePlan {
  switch (event.type) {
    case "payment.completed":
      break;
    // 취소 요청은 아직 결제가 살아 있어요. 신청은 그대로 두고 기록만 해요
    case "payment.cancel_requested":
      return { action: "record", result: "cancel_requested" };
    default:
      // 취소 완료·환불은 신청을 자동으로 지우지 않고 사람이 확인해요 (인증·점수 기록이 걸려 있어서)
      return { action: "record", result: /cancel|refund/.test(event.type) ? "review:취소·환불 확인 필요" : "recorded" };
  }
  const obj = event.data?.object ?? {};
  const email = obj.buyer?.email?.trim().toLowerCase();
  const contentId = obj.content?.id;
  if (!email || !contentId) return { action: "record", result: "failed:구매자 이메일이나 상품 id가 없어요" };
  const amount = obj.pricing?.finalAmount;
  if (obj.pricing?.currency !== "KRW" || !Number.isInteger(amount) || (amount as number) <= 0) {
    return { action: "record", result: "review:금액·통화 확인 필요" };
  }
  return { action: "enroll", email, contentId };
}

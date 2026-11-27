import { describe, expect, it } from "vitest";
import { grobleSignature, planGroble, verifyGroble, type GrobleEvent } from "./groble";

const SECRET = "groble_whsec_test_only";
const BODY = '{"id":"evt_1","type":"payment.completed"}';
const TS = "1795692294";

describe("그로블 웹훅 서명", () => {
  const sig = grobleSignature(SECRET, TS, BODY);

  it("올바른 서명과 5분 안의 시각은 통과", () => {
    expect(verifyGroble(SECRET, { signature: sig, timestamp: TS }, BODY, Number(TS) + 299)).toBeNull();
  });

  it("본문이 한 글자라도 바뀌면 거절", () => {
    expect(verifyGroble(SECRET, { signature: sig, timestamp: TS }, BODY + " ", Number(TS))).toBe("서명이 맞지 않아요");
  });

  it("다른 비밀키로 만든 서명은 거절", () => {
    const other = grobleSignature("groble_whsec_other", TS, BODY);
    expect(verifyGroble(SECRET, { signature: other, timestamp: TS }, BODY, Number(TS))).toBe("서명이 맞지 않아요");
  });

  it("5분이 넘게 지난 요청은 거절 (재전송 공격 방지)", () => {
    expect(verifyGroble(SECRET, { signature: sig, timestamp: TS }, BODY, Number(TS) + 301)).toBe("요청 시각이 5분 넘게 차이 나요");
  });

  it("헤더가 없거나 형식이 틀리면 거절", () => {
    expect(verifyGroble(SECRET, { signature: null, timestamp: TS }, BODY, Number(TS))).toBe("서명 헤더가 없어요");
    expect(verifyGroble(SECRET, { signature: sig, timestamp: "abc" }, BODY, Number(TS))).toBe("서명 헤더가 없어요");
    expect(verifyGroble(SECRET, { signature: "zz", timestamp: TS }, BODY, Number(TS))).toBe("서명이 맞지 않아요");
  });
});

const paid = (over: Partial<GrobleEvent["data"]["object"]> = {}, type = "payment.completed"): GrobleEvent => ({
  id: "evt_1",
  type,
  occurredAt: "2026-11-27T00:00:00Z",
  data: { object: { buyer: { email: " Student@Demo.test " }, content: { id: "pU9r39" }, pricing: { finalAmount: 10000, currency: "KRW" }, ...over } },
});

describe("그로블 웹훅 처리 판단 (fixture)", () => {
  it("정상 결제는 신청 (이메일은 소문자·공백 제거)", () => {
    expect(planGroble(paid())).toEqual({ action: "enroll", email: "student@demo.test", contentId: "pU9r39" });
  });

  it("금액이 0·소수·없음이거나 통화가 KRW가 아니면 신청하지 않고 검토로 남김", () => {
    const review = { action: "record", result: "review:금액·통화 확인 필요" };
    expect(planGroble(paid({ pricing: { finalAmount: 0, currency: "KRW" } }))).toEqual(review);
    expect(planGroble(paid({ pricing: { finalAmount: 99.5, currency: "KRW" } }))).toEqual(review);
    expect(planGroble(paid({ pricing: { finalAmount: 10000, currency: "USD" } }))).toEqual(review);
    expect(planGroble(paid({ pricing: undefined }))).toEqual(review);
  });

  it("구매자 이메일이나 상품 id가 없으면 실패로 기록", () => {
    expect(planGroble(paid({ buyer: {} }))).toEqual({ action: "record", result: "failed:구매자 이메일이나 상품 id가 없어요" });
  });

  it("취소 요청은 신청 유지, 취소 완료·환불은 사람이 확인, 그 밖은 기록만", () => {
    expect(planGroble(paid({}, "payment.cancel_requested"))).toEqual({ action: "record", result: "cancel_requested" });
    expect(planGroble(paid({}, "payment.cancelled"))).toEqual({ action: "record", result: "review:취소·환불 확인 필요" });
    expect(planGroble(paid({}, "payment.refunded"))).toEqual({ action: "record", result: "review:취소·환불 확인 필요" });
    expect(planGroble(paid({}, "content.updated"))).toEqual({ action: "record", result: "recorded" });
  });
});

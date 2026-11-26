import { describe, expect, it } from "vitest";
import { grobleSignature, verifyGroble } from "./groble";

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

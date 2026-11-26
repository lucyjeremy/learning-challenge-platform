import { describe, expect, it } from "vitest";
import { PASSWORD_RULE_MESSAGE, PASSWORD_TOO_LONG_MESSAGE, passwordProblem, signupProblem } from "./validation";

const ok = { email: "new@demo.test", password: "abcdefg1", passwordConfirm: "abcdefg1", name: "홍길동", agreed: true };

describe("비밀번호 규칙 (BP-AUTH-001-2)", () => {
  it("TC-FN-AUTH-002: 숫자가 없으면 거절", () => {
    expect(passwordProblem("abcdefgh")).toBe(PASSWORD_RULE_MESSAGE);
  });

  it("영문이 없으면 거절", () => {
    expect(passwordProblem("12345678")).toBe(PASSWORD_RULE_MESSAGE);
  });

  it("TC-FN-AUTH-003: 7자 거절, 8자 허용, 72자 허용, 73자 거절", () => {
    expect(passwordProblem("abcdef1")).toBe(PASSWORD_RULE_MESSAGE);
    expect(passwordProblem("abcdefg1")).toBeNull();
    expect(passwordProblem("a1" + "x".repeat(70))).toBeNull();
    expect(passwordProblem("a1" + "x".repeat(71))).toBe(PASSWORD_RULE_MESSAGE);
  });

  it("72바이트를 넘으면 거절 (한글은 1자 3바이트)", () => {
    expect(passwordProblem("a1" + "가".repeat(23))).toBeNull(); // 2 + 69 = 71바이트
    expect(passwordProblem("a1" + "가".repeat(24))).toBe(PASSWORD_TOO_LONG_MESSAGE); // 74바이트
  });
});

describe("가입 입력 검증 (서버 직접 호출 대비)", () => {
  it("정상 입력은 통과", () => {
    expect(signupProblem(ok)).toBeNull();
  });

  it("문자열이 아닌 값이나 빈 입력은 오류 없이 거절", () => {
    expect(signupProblem(null)).toBe("입력값을 확인해 주세요");
    expect(signupProblem({ ...ok, name: 123 })).toBe("입력값을 확인해 주세요");
    expect(signupProblem({ ...ok, email: null })).toBe("입력값을 확인해 주세요");
    expect(signupProblem({ ...ok, agreed: "true" })).toBe("입력값을 확인해 주세요");
  });

  it("검사 순서: 동의 → 이메일 → 비밀번호 형식 → 확인 일치 → 이름", () => {
    expect(signupProblem({ ...ok, agreed: false, email: "x" })).toBe("필수 동의 항목에 체크해 주세요");
    expect(signupProblem({ ...ok, email: "x" })).toBe("이메일 주소를 확인해 주세요");
    expect(signupProblem({ ...ok, password: "abcdefgh", passwordConfirm: "zzz" })).toBe(PASSWORD_RULE_MESSAGE);
    expect(signupProblem({ ...ok, passwordConfirm: "abcdefg2" })).toBe("비밀번호가 서로 달라요");
    expect(signupProblem({ ...ok, name: " 홍 " })).toBe("이름은 2~20자로 적어 주세요");
  });
});

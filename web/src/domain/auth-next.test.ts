import { describe, expect, it } from "vitest";
import { safeNext } from "@/components/AuthForm";

describe("로그인 뒤 돌아갈 주소 (SEC-05)", () => {
  it("같은 사이트 경로는 그대로 쓴다", () => {
    expect(safeNext("/c/python-21/feed")).toBe("/c/python-21/feed");
    expect(safeNext(null)).toBe("/");
  });

  it("외부 주소로 해석될 수 있는 값은 /로 바꾼다", () => {
    for (const bad of ["//evil.example", "https://evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "/ /evil.example", "/\u0000/evil.example"]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});

import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/AuthForm";
import { dbEnabled } from "@/server/db";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-[400px] px-5 pt-14">
      <h1 className="text-[24px] font-bold">로그인</h1>
      <p className="mt-1 text-[14px] text-grey-30">로그인하면 보던 화면으로 돌아와요.</p>
      <div className="mt-8">
        <Suspense>
          {/* 운영(DB 모드)에서는 체험용 계정 안내를 보여 주지 않아요 */}
          <LoginForm showDemo={!dbEnabled} />
        </Suspense>
      </div>
    </div>
  );
}

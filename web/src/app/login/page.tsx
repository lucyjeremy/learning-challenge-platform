import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-[400px] px-5 pt-14">
      <h1 className="text-[24px] font-bold">로그인</h1>
      <p className="mt-1 text-[14px] text-grey-30">로그인하면 보던 화면으로 돌아와요.</p>
      <div className="mt-8">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

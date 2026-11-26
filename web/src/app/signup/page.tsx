import { Suspense } from "react";
import type { Metadata } from "next";
import { SignupForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "회원가입" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-[400px] px-5 pt-14">
      <h1 className="text-[24px] font-bold">회원가입</h1>
      <p className="mt-1 text-[14px] text-grey-30">가입하면 무료 챌린지에 바로 신청할 수 있어요.</p>
      <div className="mt-8">
        <Suspense>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enrollAction } from "@/server/actions";

/** 신청 버튼. 서버에 신청을 저장하고, 성공하면 화면을 새로 불러와요. */
export function EnrollButton({ id, startDate, className = "" }: { id: string; startDate: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function enroll() {
    setError("");
    start(async () => {
      const r = await enrollAction(id);
      if (r.ok) router.refresh();
      else setError(r.message);
    });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={enroll}
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-sm bg-blue-50 px-5 text-[14px] font-bold disabled:opacity-60"
      >
        {pending ? "신청하는 중이에요" : "신청하기"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-accent-soft">
          {error}
        </p>
      )}
      <p className="mt-2 text-center text-[12px] text-grey-40">{startDate} 0시에 Day 1이 열려요.</p>
    </div>
  );
}

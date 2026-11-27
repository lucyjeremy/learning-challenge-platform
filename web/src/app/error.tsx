"use client";

import Link from "next/link";
import { useEffect } from "react";

/** 화면을 그리다 오류가 나면 영어 기본 화면 대신 보여 줘요. 다시 시도하거나 홈으로 돌아갈 수 있어요. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-content px-5 py-24 text-center">
      <h1 className="text-[20px] font-bold">화면을 불러오지 못했어요</h1>
      <p className="mt-1 text-[14px] text-grey-30">잠시 뒤 다시 시도해 주세요. 계속 안 되면 홈에서 다시 들어와 주세요.</p>
      {error.digest && <p className="mt-2 text-[12px] text-grey-40">오류 번호 {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" onClick={() => retry()} className="inline-flex h-11 items-center rounded-sm bg-blue-50 px-5 text-[14px] font-bold">
          다시 시도하기
        </button>
        <Link href="/" className="inline-flex h-11 items-center rounded-sm bg-grey-80 px-5 text-[14px] font-bold">
          홈으로
        </Link>
      </div>
    </div>
  );
}

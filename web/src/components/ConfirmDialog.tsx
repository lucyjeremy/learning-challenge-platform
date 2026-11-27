"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Ask = { title: string; body?: string; confirm: string; cancel?: string; danger?: boolean };

/**
 * 브라우저 기본 확인창 대신 쓰는 확인창. 버튼 문구를 상황에 맞게 정할 수 있어요
 * (토스 UX: 두 버튼일 때 '취소' 대신 '닫기'·'계속 쓰기'처럼 오해 없는 말).
 * 사용: const [dialog, ask] = useConfirm(); if (await ask({...})) ...
 */
export function useConfirm() {
  const [req, setReq] = useState<(Ask & { resolve: (ok: boolean) => void }) | null>(null);
  const ask = useCallback((a: Ask) => new Promise<boolean>((resolve) => setReq({ ...a, resolve })), []);
  const done = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };
  const dialog = req ? <ConfirmDialog {...req} onDone={done} /> : null;
  return [dialog, ask] as const;
}

function ConfirmDialog({ title, body, confirm, cancel = "닫기", danger, onDone }: Ask & { onDone: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onDone(false);
      }}
      className="m-auto w-[min(400px,calc(100%-32px))] rounded-md bg-grey-90 p-0 text-grey-0 backdrop:bg-black/70"
    >
      <div className="px-5 pt-5 pb-4">
        <h2 id="confirm-title" className="text-[16px] font-bold">
          {title}
        </h2>
        {body && <p className="mt-1.5 text-[14px] text-grey-30">{body}</p>}
      </div>
      <div className="flex gap-2 px-5 pb-5">
        <button type="button" autoFocus onClick={() => onDone(false)} className="h-11 flex-1 rounded-sm bg-grey-80 text-[14px] font-bold hover:bg-grey-70">
          {cancel}
        </button>
        <button
          type="button"
          onClick={() => onDone(true)}
          className={`h-11 flex-1 rounded-sm text-[14px] font-bold ${danger ? "bg-red-50" : "bg-blue-50"}`}
        >
          {confirm}
        </button>
      </div>
    </dialog>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import type { CheckinFormat } from "@/lib/data";
import { submitProofAction } from "@/server/actions";
import { safeAction } from "@/lib/safe-action";

/** 지금 한국 시간 (시, 분, 초) */
function kstNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { h: get("hour"), m: get("minute"), s: get("second") };
}

function secondsToMidnight() {
  const { h, m, s } = kstNow();
  return 24 * 3600 - (h * 3600 + m * 60 + s);
}

const noop = () => () => {};

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function CheckinForm({ challengeId, day, format }: { challengeId: string; day: number; format: CheckinFormat }) {
  const draftKey = `cu-draft-${challengeId}-${day}`;
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<"공개" | "비공개">("공개");
  const [touched, setTouched] = useState(false);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const savedDraft = useSyncExternalStore(noop, () => safeGet(draftKey), () => null);
  const draft = draftDismissed ? null : savedDraft;
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [left, setLeft] = useState<number | null>(null);
  const [result, setResult] = useState<{ points: number; streak: number; pending: boolean } | null>(null);
  const [error, setError] = useState("");
  const [sending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => setLeft(secondsToMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!text) return;
    try {
      localStorage.setItem(draftKey, text);
    } catch {}
  }, [text, draftKey]);

  const tooShort = format === "텍스트" && text.trim().length < 10;
  const badLink = format === "링크" && !/^https?:\/\/\S+$/.test(text.trim());
  const invalid = format === "텍스트" ? tooShort : format === "링크" ? badLink : false;
  const closed = left !== null && left <= 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (invalid || !online || closed) return;
    setError("");
    const value = text.trim();
    const payload = format === "링크" ? { linkUrl: value } : { body: value };
    start(async () => {
      const r = await safeAction(submitProofAction(challengeId, day, { ...payload, visibility: visibility === "공개" ? "public" : "private" }));
      if (!r.ok) {
        setError(r.message);
        return;
      }
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      setResult({ points: r.value.points, streak: r.value.streak, pending: r.value.status === "pending" });
      router.refresh();
    });
  }

  if (result) {
    return (
      <div role="status" className="mt-3 rounded-md bg-grey-90 px-5 py-6">
        <p className="text-[18px] font-bold" aria-hidden>
          +{result.points}점 · 🔥 {result.streak}일 연속
        </p>
        <p className="sr-only">
          {result.points}점, {result.streak}일 연속 인증
        </p>
        <p className="mt-1 text-[14px] text-grey-30">
          {result.pending ? "강사가 확인하면 인정돼요. " : "인증을 마쳤어요. "}
          {visibility === "공개" ? "피드에도 올라갔어요." : "강사만 볼 수 있어요."} 내일 0시에 다음 Day가 열려요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-3 rounded-md bg-grey-90 p-4 sm:p-5">
      {!online && (
        <p role="alert" className="mb-3 rounded-sm bg-grey-80 px-3 py-2 text-[13px]">
          인터넷 연결이 끊겼어요. 쓰던 내용은 이 기기에 저장하고 있어요.
        </p>
      )}

      {draft && !text && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-sm bg-grey-80 px-3 py-2 text-[13px]">
          작성 중이던 내용을 불러올까요?
          <button type="button" className="font-bold text-accent-soft" onClick={() => { setText(draft); setDraftDismissed(true); }}>
            불러오기
          </button>
          <button
            type="button"
            className="text-grey-30"
            onClick={() => {
              setDraftDismissed(true);
              try { localStorage.removeItem(draftKey); } catch {}
            }}
          >
            새로 쓰기
          </button>
        </div>
      )}

      {format === "체크" ? (
        <>
          <label htmlFor="msg" className="text-[13px] text-grey-30">한마디 (선택)</label>
          <input id="msg" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} className="mt-1 h-11 w-full rounded-sm bg-grey-97 px-3 text-[14px]" />
        </>
      ) : format === "링크" ? (
        <>
          <label htmlFor="link" className="text-[13px] text-grey-30">결과물 링크</label>
          <input
            id="link"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={touched && badLink}
            aria-describedby="checkin-help"
            className="mt-1 h-11 w-full rounded-sm bg-grey-97 px-3 text-[14px] placeholder:text-grey-50"
          />
        </>
      ) : (
        <>
          <label htmlFor="body" className="text-[13px] text-grey-30">코드와 실행 결과</label>
          <textarea
            id="body"
            rows={8}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={touched && tooShort}
            aria-describedby="checkin-help"
            spellCheck={false}
            placeholder={"total = 0\nn = 0\nwhile True:\n    ..."}
            className="mt-1 w-full resize-y rounded-sm bg-grey-97 p-3 font-mono text-[13px] leading-relaxed placeholder:text-grey-50"
          />
        </>
      )}

      <p id="checkin-help" className={`mt-1 text-[12px] ${touched && invalid ? "text-accent-soft" : "text-grey-40"}`}>
        {format === "텍스트" && (touched && tooShort ? "10자 이상 적어 주세요" : `${text.length} / 2,000자 · 10자 이상`)}
        {format === "링크" && (touched && badLink ? "http:// 또는 https://로 시작하는 주소를 넣어 주세요" : "링크 1개를 넣어 주세요")}
        {format === "체크" && "200자까지 쓸 수 있어요"}
      </p>

      <fieldset className="mt-4">
        <legend className="text-[13px] text-grey-30">공개 범위</legend>
        <div className="mt-2 flex gap-2">
          {(["공개", "비공개"] as const).map((v) => (
            <label
              key={v}
              className={`cursor-pointer rounded-chip px-3 py-1.5 text-[13px] has-focus-visible:outline-2 has-focus-visible:outline-grey-0 ${
                visibility === v ? "bg-grey-0 font-bold text-grey-97" : "bg-grey-80 text-grey-20"
              }`}
            >
              <input type="radio" name="visibility" className="sr-only" checked={visibility === v} onChange={() => setVisibility(v)} />
              {v === "공개" ? "공개 · 피드에 올리기" : "비공개 · 강사만 보기"}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!online || closed || sending}
          className="h-11 rounded-sm bg-blue-50 px-6 text-[14px] font-bold disabled:bg-grey-70 disabled:text-grey-30"
        >
          {sending ? "보내는 중" : format === "체크" ? "완료했어요" : "인증하기"}
        </button>
        <p className="text-[13px] text-grey-40" aria-live="polite">
          {left !== null && left <= 300 && left > 0
            ? `마감까지 ${Math.floor(left / 60)}분 ${left % 60}초`
            : `마감 23:59 (한국 시간)`}
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-accent-soft">
          {error}
        </p>
      )}
      {closed && (
        <p role="alert" className="mt-3 text-[13px] text-grey-30">
          아쉽지만 Day {day} 인증 마감(23:59)이 지났어요. 다음 Day는 내일 00:00에 열려요. 쓴 내용은 이 기기에 남아 있어요.
        </p>
      )}
    </form>
  );
}

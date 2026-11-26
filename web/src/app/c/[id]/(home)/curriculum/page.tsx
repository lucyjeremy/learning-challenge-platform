import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChallenge } from "@/lib/data";
import { addDays, currentDay, fmtDate, requiredCheckins } from "@/lib/format";
import { currentUserId } from "@/server/actions";
import { dayStatusesFor } from "@/server/store";

export const metadata: Metadata = { title: "내 강의실" };

type Status = ReturnType<typeof dayStatusesFor>[number];

/**
 * 내 강의실. 참고: Skool Classroom(진행률 + 레슨 목록), 인프런·클래스101 내 학습(이어서 학습하기 버튼, 주차별 묶음).
 * 위에서부터 "오늘 할 일 → 전체 진행 → 주차별 목록" 순서로 보여 줘요.
 */
export default async function ClassroomPage({ params }: PageProps<"/c/[id]/curriculum">) {
  const { id } = await params;
  const c = getChallenge(id);
  if (!c) notFound();
  const today = currentDay(c);
  const statuses = dayStatusesFor(await currentUserId(), id);
  const done = Object.values(statuses).filter((s) => s === "인정").length;
  const missed = Object.values(statuses).filter((s) => s === "놓침").length;
  const need = requiredCheckins(c);
  const todayStatus = statuses[today];

  const weeks = Array.from({ length: Math.ceil(c.days / 7) }, (_, w) => {
    const from = w * 7 + 1;
    const to = Math.min(from + 6, c.days);
    return { no: w + 1, days: Array.from({ length: to - from + 1 }, (_, i) => from + i) };
  });
  const currentWeek = Math.ceil(today / 7);

  return (
    <div className="space-y-6">
      {/* 1. 오늘 할 일 */}
      <section aria-labelledby="continue" className="rounded-md bg-grey-90 p-5 sm:p-6">
        <p id="continue" className="text-[13px] font-bold text-accent-soft">
          {todayStatus === "인정" ? "오늘 인증 완료" : "이어서 하기"}
        </p>
        <p className="mt-1 text-[13px] text-grey-40 tabular-nums">
          Day {today} · {fmtDate(addDays(c.startDate, today - 1))}
        </p>
        <h2 className="mt-1 text-[20px] font-bold">{c.dayTitles[today - 1]}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href={`/c/${id}/day/${today}`} className="inline-flex h-11 items-center rounded-sm bg-blue-50 px-5 text-[14px] font-bold">
            {todayStatus === "인정" ? "오늘 강의 다시 보기" : todayStatus === "강사 확인 중" ? "제출한 인증 보기" : "강의 보고 인증하기"}
          </Link>
          {todayStatus !== "인정" && todayStatus !== "강사 확인 중" && (
            <span className="text-[13px] text-grey-30">오늘 23:59까지 인증해야 연속 기록이 이어져요</span>
          )}
        </div>
      </section>

      {/* 2. 전체 진행: 한눈에 보는 Day 칸 */}
      <section aria-labelledby="progress" className="rounded-md bg-grey-90 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="progress" className="text-[15px] font-bold">
            완주까지 <span className="tabular-nums">{Math.max(need - done, 0)}일</span> 남았어요
          </h2>
          <p className="text-[13px] text-grey-30 tabular-nums">
            인증 {done} · 놓침 {missed} · 완주 기준 {need}일
          </p>
        </div>
        <ol aria-label="Day별 진행" className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: c.days }, (_, i) => {
            const n = i + 1;
            const s = statuses[n];
            const tone =
              s === "인정"
                ? "bg-blue-50 text-grey-0"
                : s === "강사 확인 중"
                  ? "bg-grey-50 text-grey-0"
                  : s === "놓침"
                    ? "bg-grey-80 text-grey-50 line-through"
                    : n === today
                      ? "bg-grey-97 text-grey-0 ring-2 ring-blue-50"
                      : n > today
                        ? "bg-grey-97 text-grey-50"
                        : "bg-grey-80 text-grey-30";
            const label = `Day ${n} ${s ?? (n === today ? "오늘" : n > today ? "열리기 전" : "미인증")}`;
            return (
              <li key={n}>
                {n > today ? (
                  <span title={label} aria-label={label} className={`grid h-9 place-items-center rounded-sm text-[12px] font-bold tabular-nums ${tone}`}>
                    {n}
                  </span>
                ) : (
                  <Link
                    href={`/c/${id}/day/${n}`}
                    title={label}
                    aria-label={label}
                    className={`grid h-9 place-items-center rounded-sm text-[12px] font-bold tabular-nums hover:opacity-80 ${tone}`}
                  >
                    {n}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-grey-40">
          <Legend className="bg-blue-50" label="인증" />
          <Legend className="bg-grey-50" label="확인 중" />
          <Legend className="bg-grey-80" label="놓침" />
          <Legend className="bg-grey-97 ring-2 ring-blue-50" label="오늘" />
        </ul>
      </section>

      {/* 3. 주차별 강의 목록: 이번 주는 펼치고 나머지는 접어요 */}
      <section aria-labelledby="lessons" className="space-y-3">
        <h2 id="lessons" className="text-[15px] font-bold">
          강의 목록
        </h2>
        {weeks.map((w) => {
          const weekDone = w.days.filter((n) => statuses[n] === "인정").length;
          const locked = w.days[0] > today;
          return (
            <details key={w.no} open={w.no === currentWeek} className="group overflow-hidden rounded-md bg-grey-90">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 hover:bg-grey-80 [&::-webkit-details-marker]:hidden">
                <span className="text-[14px] font-bold">{w.no}주차</span>
                <span className="text-[12px] text-grey-40 tabular-nums">
                  Day {w.days[0]}–{w.days[w.days.length - 1]}
                </span>
                <span className="ml-auto text-[12px] text-grey-30 tabular-nums">
                  {locked ? `${fmtDate(addDays(c.startDate, w.days[0] - 1))}에 열려요` : `${weekDone} / ${w.days.length} 완료`}
                </span>
                <svg viewBox="0 0 24 24" className="size-4 shrink-0 stroke-grey-40 transition-transform group-open:rotate-180" fill="none" strokeWidth={2} aria-hidden>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <ol className="divide-y divide-grey-80 border-t border-grey-80">
                {w.days.map((n) => (
                  <Lesson key={n} id={id} n={n} title={c.dayTitles[n - 1]} date={addDays(c.startDate, n - 1)} today={today} status={statuses[n]} />
                ))}
              </ol>
            </details>
          );
        })}
      </section>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={`size-3 rounded-[3px] ${className}`} />
      {label}
    </li>
  );
}

function Lesson({ id, n, title, date, today, status }: { id: string; n: number; title: string; date: string; today: number; status: Status }) {
  const locked = n > today;
  const isToday = n === today;
  const inner = (
    <>
      <StatusIcon locked={locked} isToday={isToday} status={status} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[14px] ${locked ? "text-grey-40" : ""} ${isToday ? "font-bold" : ""}`}>
          <span className="mr-2 text-[12px] font-bold text-grey-40 tabular-nums">Day {n}</span>
          {title}
        </span>
        <span className="block text-[12px] text-grey-40">
          {locked ? `${fmtDate(date)} 00:00에 열려요` : fmtDate(date)}
        </span>
      </span>
      <StatusText locked={locked} isToday={isToday} status={status} />
    </>
  );
  return (
    <li className={isToday ? "bg-grey-80" : ""}>
      {locked ? (
        <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
      ) : (
        <Link href={`/c/${id}/day/${n}`} className="flex items-center gap-3 px-4 py-3 hover:bg-grey-80">
          {inner}
        </Link>
      )}
    </li>
  );
}

function StatusIcon({ locked, isToday, status }: { locked: boolean; isToday: boolean; status: Status }) {
  const base = "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold";
  if (status === "인정") return <span aria-hidden className={`${base} bg-blue-50`}>✓</span>;
  if (status === "강사 확인 중") return <span aria-hidden className={`${base} bg-grey-50`}>…</span>;
  if (status === "놓침") return <span aria-hidden className={`${base} bg-grey-80 text-grey-40`}>–</span>;
  if (locked)
    return (
      <span aria-hidden className={`${base} bg-grey-97`}>
        <svg viewBox="0 0 24 24" className="size-3.5 stroke-grey-50" fill="none" strokeWidth={2}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
    );
  if (isToday)
    return (
      <span aria-hidden className={`${base} bg-grey-97 ring-2 ring-blue-50`}>
        <svg viewBox="0 0 24 24" className="size-3 fill-grey-0">
          <path d="M8 5.5v13l10.5-6.5z" />
        </svg>
      </span>
    );
  return <span aria-hidden className={`${base} border border-grey-70`} />;
}

function StatusText({ locked, isToday, status }: { locked: boolean; isToday: boolean; status: Status }) {
  if (locked) return <span className="sr-only">잠김</span>;
  if (status === "인정") return <span className="shrink-0 text-[12px] text-grey-30">인증 완료</span>;
  if (status === "강사 확인 중") return <span className="shrink-0 text-[12px] text-grey-30">확인 중</span>;
  if (status === "놓침") return <span className="shrink-0 text-[12px] text-grey-40">놓쳤어요</span>;
  if (isToday) return <span className="shrink-0 rounded-sm bg-blue-50 px-2.5 py-1 text-[12px] font-bold">오늘 · 인증하기</span>;
  return <span className="shrink-0 text-[12px] text-grey-40">다시 보기</span>;
}

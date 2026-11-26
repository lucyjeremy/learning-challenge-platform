import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HomeTabs } from "@/components/HomeTabs";
import { TodayMission } from "@/components/TodayMission";
import { Avatar } from "@/components/ui";
import { challenges, getChallenge, leaderboard, todayCheckins } from "@/lib/data";
import { currentUserId } from "@/server/actions";
import { dayStatusesFor, isMemberOf } from "@/server/store";
import { currentDay, fmtDate, requiredCheckins } from "@/lib/format";

export function generateStaticParams() {
  return challenges.map((c) => ({ id: c.id }));
}

export default async function ChallengeHomeLayout({ children, params }: LayoutProps<"/c/[id]">) {
  const { id } = await params;
  const c = getChallenge(id);
  if (!c) notFound();
  // 신청하지 않은 사람은 소개 페이지로 보내요 (BP-CONTENT-001-1)
  const uid = await currentUserId();
  if (!isMemberOf(uid, id)) redirect(`/c/${id}`);

  const statuses = Object.values(dayStatusesFor(uid, id));
  const done = statuses.filter((s) => s === "인정").length;
  const need = requiredCheckins(c);
  const today = currentDay(c);
  const pct = Math.round((done / need) * 100);
  const top5 = leaderboard["7일"].slice(0, 5);
  const rate = Math.round((todayCheckins.done / todayCheckins.total) * 100);

  return (
    <div className="mx-auto max-w-content px-5 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/c/${id}`} className="text-[13px] text-grey-40 hover:text-grey-20">
            {c.category} · {c.instructor.name}
          </Link>
          <h1 className="mt-1 text-[24px] font-bold">{c.title}</h1>
        </div>
        <p className="text-[13px] text-grey-30 tabular-nums">
          {today < 1 ? `${fmtDate(c.startDate)} 시작 · D-${1 - today}` : today > c.days ? "종료된 챌린지" : `Day ${today} / ${c.days} 진행 중`}
        </p>
      </div>

      <HomeTabs id={id} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">{children}</div>

        <aside aria-label="내 진행 요약" className="space-y-4 lg:sticky lg:top-[130px] lg:self-start">
          <section className="rounded-md bg-grey-90 p-4">
            <h2 className="text-[13px] text-grey-30">내 진행률</h2>
            <p className="mt-1 text-[20px] font-bold tabular-nums">
              {done} / {need}일
              <span className="ml-2 text-[13px] font-normal text-grey-30">완주까지 {need - done}일 더</span>
            </p>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-grey-70"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={need}
              aria-valuenow={done}
              aria-label="완주 진행률"
            >
              <div className="h-full rounded-full bg-grey-0" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </section>

          <TodayMission id={id} compact />

          <section className="rounded-md bg-grey-90 p-4">
            <h2 className="text-[13px] text-grey-30">오늘 인증한 사람</h2>
            <p className="mt-1 text-[20px] font-bold tabular-nums">
              {todayCheckins.done}명
              <span className="ml-2 text-[13px] font-normal text-grey-30">
                {todayCheckins.total}명 중 · {rate}%
              </span>
            </p>
          </section>

          <section className="rounded-md bg-grey-90 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] text-grey-30">이번 주 순위</h2>
              <Link href={`/c/${id}/leaderboard`} className="text-[13px] text-accent-soft hover:underline">
                전체 보기
              </Link>
            </div>
            <ol className="mt-3 space-y-2.5">
              {top5.map((r) => {
                const rank = top5.findIndex((x) => x.points === r.points) + 1;
                return (
                  <li key={r.name} className="flex items-center gap-2.5 text-[14px]">
                    <span className="w-4 text-center text-[12px] font-bold text-grey-40 tabular-nums">{rank}</span>
                    <Avatar name={r.name} size={24} />
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className="font-bold tabular-nums">{r.points}</span>
                    <span className="sr-only">점</span>
                  </li>
                );
              })}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

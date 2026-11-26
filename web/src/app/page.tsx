import Link from "next/link";
import { Suspense } from "react";
import { ChallengeCard } from "@/components/ChallengeCard";
import { ExploreList } from "@/components/ExploreList";
import { TodayMission } from "@/components/TodayMission";
import { challenges, TODAY } from "@/lib/data";
import { currentUserId } from "@/server/actions";
import { dayStatusesFor, getUser, isMemberOf, streakOf } from "@/server/store";
import { currentDay, daysBetween, phase, requiredCheckins } from "@/lib/format";

export default async function HomePage() {
  const user = getUser(await currentUserId());
  const startingSoon = challenges
    .filter((c) => phase(c) === "모집 중" && daysBetween(TODAY, c.startDate) <= 7)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const running = challenges.filter((c) => phase(c) === "진행 중");
  // 내 챌린지: 진행 중(오늘 미인증 먼저) → 시작 예정 순서
  const checkedToday = (id: string, day: number) => {
    const s = user ? dayStatusesFor(user.id, id)[day] : undefined;
    return s === "인정" || s === "강사 확인 중";
  };
  const myRunning = user
    ? running
        .filter((c) => isMemberOf(user.id, c.id))
        .sort((a, b) => Number(checkedToday(a.id, currentDay(a))) - Number(checkedToday(b.id, currentDay(b))))
    : [];
  const myUpcoming = user
    ? challenges.filter((c) => phase(c) === "모집 중" && isMemberOf(user.id, c.id)).sort((a, b) => a.startDate.localeCompare(b.startDate))
    : [];
  const mine = [...myRunning, ...myUpcoming].map((c) => c.id);
  const streakTarget = myRunning[0];

  return (
    <div className="mx-auto max-w-content px-5">
      {user ? (
        <section id="today" aria-labelledby="today-title" className="scroll-mt-28 pt-8">
          <h1 id="today-title" className="text-[20px] font-bold">
            {user.name}님, 오늘도 한 걸음 가 볼까요?
          </h1>
          {mine.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
              {mine.map((id) => (
                <TodayMission key={id} id={id} />
              ))}
              {user && streakTarget && <MyStreak userId={user.id} id={streakTarget.id} />}
            </div>
          ) : (
            <p className="mt-3 rounded-md bg-grey-90 px-5 py-5 text-[14px] text-grey-30">
              아직 신청한 챌린지가 없어요. 아래에서 이번 주에 시작하는 챌린지를 골라 보세요.
            </p>
          )}
        </section>
      ) : (
        <section aria-labelledby="hero-title" className="pt-10">
          <h1 id="hero-title" className="text-[26px] font-bold leading-snug">
            혼자서는 끝까지 못 했던 공부,
            <br />
            같은 기수와 매일 인증하며 완주해요
          </h1>
          <p className="mt-2 text-[15px] text-grey-30">정해진 기간 동안 매일 강의 하나, 미션 하나. 완주하면 수료 배지를 받아요.</p>
          <div className="mt-5 flex gap-2">
            <Link href="/signup" className="rounded-sm bg-blue-50 px-5 py-3 text-[14px] font-bold">무료로 시작하기</Link>
            <Link href="/#explore" className="rounded-sm border border-grey-50 px-5 py-3 text-[14px] font-bold">챌린지 둘러보기</Link>
          </div>
        </section>
      )}

      <Section title="🔥 이번 주에 시작해요" more={{ href: "/?sort=deadline#explore", label: "마감 임박순으로 보기" }}>
        <Row>
          {startingSoon.map((c) => (
            <li key={c.id} className="w-[78%] shrink-0 snap-start sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-21px)]">
              <ChallengeCard c={c} />
            </li>
          ))}
        </Row>
      </Section>

      <Section title="지금 함께 달리는 중">
        <p className="-mt-2 mb-4 text-[14px] text-grey-40">
          이미 시작한 기수예요. 어떤 강의와 미션으로 진행되는지 미리 볼 수 있어요.
        </p>
        <Row>
          {running.map((c) => (
            <li key={c.id} className="w-[78%] shrink-0 snap-start sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-21px)]">
              <ChallengeCard c={c} />
            </li>
          ))}
        </Row>
      </Section>

      <section id="explore" aria-labelledby="explore-title" className="mt-16 scroll-mt-28">
        <h2 id="explore-title" className="mb-4 text-[20px] font-bold">모든 챌린지</h2>
        <Suspense
          fallback={
            <ul className="mt-[58px] grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {challenges.filter((c) => phase(c) === "모집 중").map((c) => (
                <li key={c.id}>
                  <ChallengeCard c={c} />
                </li>
              ))}
            </ul>
          }
        >
          <ExploreList all={challenges} />
        </Suspense>
      </section>
    </div>
  );
}

/** 내 기록: 가장 먼저 보이는 진행 중 챌린지의 실제 스트릭·인증 수 */
function MyStreak({ userId, id }: { userId: string; id: string }) {
  const c = challenges.find((x) => x.id === id)!;
  const statuses = dayStatusesFor(userId, id);
  const done = Object.values(statuses).filter((s) => s === "인정").length;
  const opened = Math.min(currentDay(c), c.days);
  const left = Math.max(requiredCheckins(c) - done, 0);
  return (
    <div className="flex flex-col justify-between rounded-md bg-grey-90 p-5">
      <div>
        <p className="text-[13px] text-grey-30">{c.title} · 내 기록</p>
        <p className="mt-2 text-[28px] leading-none font-bold tabular-nums">
          🔥 {streakOf(userId, id).current}
          <span className="ml-1 text-[14px] font-normal text-grey-30">일 연속</span>
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
        <div>
          <dt className="text-grey-40">인증</dt>
          <dd className="font-bold tabular-nums">
            {done} / {opened}일
          </dd>
        </div>
        <div>
          <dt className="text-grey-40">완주까지</dt>
          <dd className="font-bold tabular-nums">{left === 0 ? "기준 달성" : `${left}일 더`}</dd>
        </div>
      </dl>
      <Link href={`/c/${id}/feed`} className="mt-4 text-[14px] text-accent-soft hover:underline">
        챌린지 홈으로 →
      </Link>
    </div>
  );
}

function Section({
  title,
  more,
  children,
}: {
  title: string;
  more?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-[20px] font-bold">{title}</h2>
        {more && (
          <Link href={more.href} className="shrink-0 text-[14px] text-accent-soft sm:text-[16px]">
            <span className="sm:hidden">더 보기</span>
            <span className="hidden sm:inline">{more.label}</span> →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <ul className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 sm:gap-8">
      {children}
    </ul>
  );
}

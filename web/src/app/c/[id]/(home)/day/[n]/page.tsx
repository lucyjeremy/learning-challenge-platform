import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckinForm } from "@/components/CheckinForm";
import { challenges, getChallenge, missionDetail } from "@/lib/data";
import { currentUserId } from "@/server/actions";
import { dayStatusesFor, isInstructorOf, mySubmission, streakOf, submissionPoints } from "@/server/store";
import { addDays, currentDay, fmtDate } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return challenges.flatMap((c) => c.dayTitles.map((_, i) => ({ id: c.id, n: String(i + 1) })));
}

export async function generateMetadata({ params }: PageProps<"/c/[id]/day/[n]">): Promise<Metadata> {
  const { n } = await params;
  return { title: `Day ${n}` };
}

export default async function DayPage({ params }: PageProps<"/c/[id]/day/[n]">) {
  const { id, n: nParam } = await params;
  const c = getChallenge(id);
  const n = Number(nParam);
  if (!c || !Number.isInteger(n) || n < 1 || n > c.days) notFound();

  const today = currentDay(c);
  const date = addDays(c.startDate, n - 1);
  const uid = await currentUserId();
  const status = dayStatusesFor(uid, id)[n];
  const sub = uid ? mySubmission(uid, id, n) : undefined;
  const streak = uid ? streakOf(uid, id).current : 0;
  const detail = missionDetail[n];
  // 그 챌린지의 강사는 모든 Day를 볼 수 있고, 인증은 제출하지 않아요 (BP-CONTENT-001, BP-SUB-004-6)
  const instructor = isInstructorOf(uid, id);

  const nav = (
    <div className="mt-8 flex justify-between text-[14px]">
      {n > 1 ? (
        <Link href={`/c/${id}/day/${n - 1}`} className="inline-flex min-h-11 items-center text-grey-30 hover:text-grey-0">← Day {n - 1}</Link>
      ) : <span />}
      {(n < today || instructor) && n < c.days ? (
        <Link href={`/c/${id}/day/${n + 1}`} className="inline-flex min-h-11 items-center text-grey-30 hover:text-grey-0">Day {n + 1} →</Link>
      ) : <span />}
    </div>
  );

  if (n > today && !instructor) {
    return (
      <div className="rounded-md bg-grey-90 px-6 py-14 text-center">
        <p className="text-[12px] font-bold text-grey-40">Day {n}</p>
        <p className="mt-2 text-[18px] font-bold">아직 열리지 않은 Day예요</p>
        <p className="mt-1 text-[14px] text-grey-30">{fmtDate(date)} 00:00 (한국 시간)에 열려요.</p>
        <Link href={`/c/${id}/curriculum`} className="mt-6 inline-block text-[14px] text-accent-soft hover:underline">
          내 강의실로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <article>
      <p className="text-[13px] text-grey-40 tabular-nums">
        <Link href={`/c/${id}/curriculum`} className="inline-flex min-h-11 items-center hover:text-grey-20">내 강의실</Link> · Day {n} / {c.days} · {fmtDate(date)}
      </p>
      <h2 className="mt-1 text-[22px] font-bold">{c.dayTitles[n - 1]}</h2>

      <div className="mt-5 flex items-center gap-4 rounded-md bg-grey-90 px-5 py-4">
        <svg viewBox="0 0 24 24" className="size-9 shrink-0 fill-grey-50" aria-hidden>
          <path d="M8 5.5v13l10.5-6.5z" />
        </svg>
        <div>
          <p className="text-[14px] font-bold">강의 영상{detail ? ` · ${detail.minutes}분` : ""}</p>
          <p className="text-[13px] text-grey-40">강사가 영상을 올리면 이 자리에서 바로 볼 수 있어요.</p>
        </div>
      </div>

      <section aria-labelledby="mission" className="mt-8">
        <h3 id="mission" className="text-[16px] font-bold">오늘의 미션</h3>
        <div className="mt-2 text-[15px] leading-[1.75] whitespace-pre-line text-grey-20">
          {detail?.mission ?? `${c.dayTitles[n - 1]} 강의를 보고, 배운 내용을 직접 해 본 결과를 인증해 주세요.`}
        </div>
        {detail?.hint && (
          <p className="mt-3 rounded-sm bg-grey-90 px-4 py-3 text-[13px] text-grey-30">
            <span className="font-bold text-grey-20">힌트</span> {detail.hint}
          </p>
        )}
      </section>

      <section aria-labelledby="checkin" className="mt-8">
        <h3 id="checkin" className="text-[16px] font-bold">인증</h3>
        {status === "인정" || status === "강사 확인 중" ? (
          <div role="status" className="mt-3 rounded-md bg-grey-90 px-5 py-5">
            <p className="text-[16px] font-bold">
              {status === "인정" ? "✔ 인증을 마쳤어요" : "제출했어요. 강사가 확인하면 인정돼요"}
              {sub && status === "인정" && (
                <span className="ml-2 text-[14px] text-accent-soft tabular-nums">
                  +{submissionPoints(sub)}점{n === today && streak > 0 ? ` · 🔥 ${streak}일 연속` : ""}
                </span>
              )}
            </p>
            {sub && (sub.body || sub.linkUrl) && (
              <pre className="mt-3 max-h-60 overflow-auto rounded-sm bg-grey-97 px-3 py-2.5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-grey-20">
                {sub.linkUrl ?? sub.body}
              </pre>
            )}
            <p className="mt-3 text-[13px] text-grey-30">
              {sub?.visibility === "public" ? "피드에도 올라갔어요. " : ""}
              {n === today ? "내일 00:00에 다음 Day가 열려요." : ""}
            </p>
          </div>
        ) : instructor ? (
          <p className="mt-3 rounded-md bg-grey-90 px-4 py-4 text-[14px] text-grey-30">강사는 인증을 제출하지 않아요. 참여자 인증은 피드에서 볼 수 있어요.</p>
        ) : n < today ? (
          <p className="mt-3 rounded-md bg-grey-90 px-4 py-4 text-[14px] text-grey-30">
            Day {n} 인증 마감이 지났어요. 강의와 미션은 계속 볼 수 있어요.
          </p>
        ) : (
          <CheckinForm challengeId={id} day={n} format={c.format} />
        )}
      </section>

      {nav}
    </article>
  );
}

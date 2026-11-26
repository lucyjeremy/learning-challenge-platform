import Link from "next/link";
import { getChallenge } from "@/lib/data";
import { currentDay } from "@/lib/format";
import { currentUserId } from "@/server/actions";
import { dayStatusesFor } from "@/server/store";

/** 오늘의 미션 카드 (SCR-01 / 챌린지 홈 요약 영역) */
export async function TodayMission({ id, compact = false }: { id: string; compact?: boolean }) {
  const c = getChallenge(id);
  if (!c) return null;
  const day = currentDay(c);
  const status = dayStatusesFor(await currentUserId(), id)[day];

  return (
    <div className={`rounded-md bg-grey-90 ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-grey-30">
        {!compact && <span className="font-bold text-grey-0">{c.title}</span>}
        <span className="tabular-nums">
          Day {day} / {c.days}
        </span>
      </p>
      <p className={`mt-1 font-bold ${compact ? "text-[16px]" : "text-[20px]"}`}>{c.dayTitles[day - 1]}</p>
      <p className="mt-1 text-[13px] text-grey-30">마감 23:59 (한국 시간)</p>
      <div className={`flex flex-wrap items-center gap-3 ${compact ? "mt-3" : "mt-4"}`}>
        {status === "인정" ? (
          <p className="text-[14px] font-bold">✔ 오늘 인증을 마쳤어요</p>
        ) : (
          <>
            <Link
              href={`/c/${c.id}/day/${day}`}
              className="inline-flex h-11 items-center rounded-sm bg-blue-50 px-5 text-[14px] font-bold"
            >
              미션하러 가기
            </Link>
            {!compact && <p className="text-[13px] text-grey-30">아직 인증하지 않았어요</p>}
          </>
        )}
      </div>
    </div>
  );
}

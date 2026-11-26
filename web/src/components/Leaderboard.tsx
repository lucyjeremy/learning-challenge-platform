"use client";

import { useState } from "react";
import type { Row } from "@/lib/data";
import { Avatar } from "./ui";

type Period = "7일" | "30일" | "전체";
const PERIODS: Period[] = ["7일", "30일", "전체"];

/** 같은 점수는 같은 순위, 다음 순위는 건너뛰어요 (1, 1, 3) */
function ranked(rows: Row[]) {
  return rows.map((r) => ({ ...r, rank: rows.findIndex((x) => x.points === r.points) + 1 }));
}

export function Leaderboard({ data }: { data: Record<Period, Row[]> }) {
  const [period, setPeriod] = useState<Period>("7일");
  const rows = ranked(data[period]);
  const me = rows.find((r) => r.me);

  return (
    <div>
      <div role="group" aria-label="기간" className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={period === p}
            onClick={() => setPeriod(p)}
            className={`h-[34px] rounded-chip px-3 text-[14px] ${
              period === p ? "bg-grey-0 font-bold text-grey-97" : "bg-grey-80 text-grey-20 hover:bg-grey-70"
            }`}
          >
            {p === "전체" ? "전체 기간" : `최근 ${p}`}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-center text-[14px] text-grey-40">첫 참여자를 기다리고 있어요</p>
      ) : (
        <>
          {me && (
            <div className="mt-4 flex items-center gap-3 rounded-md border border-grey-70 bg-grey-80 px-4 py-3">
              <span className="w-8 text-center text-[16px] font-bold tabular-nums">{me.rank}</span>
              <span className="flex-1 text-[14px]">
                <span className="font-bold">내 순위</span>
                <span className="ml-2 text-grey-30">
                  {me.rank === 1 ? "지금 1등이에요" : `${rows[me.rank - 2]?.points - me.points}점 더 모으면 한 단계 올라가요`}
                </span>
              </span>
              <span className="text-[16px] font-bold tabular-nums">{me.points}점</span>
            </div>
          )}

          <table className="mt-4 w-full overflow-hidden rounded-md bg-grey-90 text-[14px]">
            <caption className="sr-only">최근 {period} 포인트 순위</caption>
            <thead>
              <tr className="border-b border-grey-80 text-left text-[12px] text-grey-40">
                <th scope="col" className="w-14 py-2.5 pl-4 font-normal">순위</th>
                <th scope="col" className="py-2.5 font-normal">이름</th>
                <th scope="col" className="w-20 py-2.5 text-right font-normal">연속</th>
                <th scope="col" className="w-20 py-2.5 pr-4 text-right font-normal">포인트</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className={`border-b border-grey-80 last:border-0 ${r.me ? "bg-grey-80" : ""}`}>
                  <td className="py-3 pl-4 font-bold tabular-nums">{r.rank}</td>
                  <td className="py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={r.name} size={28} />
                      <span className={r.me ? "font-bold" : ""}>{r.name}</span>
                      <abbr title={`레벨 ${r.level}`} className="rounded-sm bg-grey-70 px-1.5 text-[11px] font-bold no-underline">
                        Lv{r.level}
                      </abbr>
                    </span>
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {r.streak > 0 ? (
                      <span aria-label={`${r.streak}일 연속 인증`}>🔥 {r.streak}</span>
                    ) : (
                      <span className="text-grey-50" aria-label="연속 인증 없음">-</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right font-bold tabular-nums">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <details className="mt-6 rounded-md bg-grey-90 px-4 py-3 text-[14px]">
        <summary className="cursor-pointer font-bold">점수 받는 방법</summary>
        <ul className="mt-3 space-y-1.5 text-grey-20">
          <li>미션 인증 <b className="text-grey-0">+10점</b> · 저녁 9시 전에 인증하면 <b className="text-grey-0">+5점</b> 더</li>
          <li>내 글이 받은 좋아요 1개당 <b className="text-grey-0">+1점</b></li>
          <li>다른 사람 글에 댓글 <b className="text-grey-0">+2점</b> (하루 5개까지)</li>
          <li>7일 연속 인증할 때마다 <b className="text-grey-0">+30점</b>, 21일째는 <b className="text-grey-0">+100점</b></li>
        </ul>
        <p className="mt-3 text-[12px] text-grey-40">레벨은 모든 챌린지에서 모은 점수로 정해져요. Lv2 20점 · Lv3 60점 · Lv4 150점 · Lv5 300점</p>
      </details>
    </div>
  );
}

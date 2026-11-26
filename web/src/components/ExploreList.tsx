"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, type Challenge } from "@/lib/data";
import { daysBetween, phase } from "@/lib/format";
import { TODAY } from "@/lib/data";
import { ChallengeCard } from "./ChallengeCard";
import { Button } from "./ui";

const SORTS = ["최신순", "인기순", "마감 임박순"] as const;
type Sort = (typeof SORTS)[number];
const PAGE = 12;

function arrange(all: Challenge[], category: string | null, q: string, sort: Sort) {
  let list = all.filter((c) => phase(c) !== "종료");
  if (category) list = list.filter((c) => c.category === category);
  const query = q.trim().toLowerCase();
  if (query) {
    list = list.filter(
      (c) => c.title.toLowerCase().includes(query) || c.instructor.name.toLowerCase().includes(query),
    );
  }
  const recruitingFirst = (a: Challenge, b: Challenge) =>
    Number(phase(a) !== "모집 중") - Number(phase(b) !== "모집 중");
  if (sort === "인기순") return [...list].sort((a, b) => b.enrolled - a.enrolled);
  if (sort === "마감 임박순") {
    return list
      .filter((c) => phase(c) === "모집 중" && c.enrolled < c.capacity)
      .sort((a, b) => daysBetween(TODAY, a.startDate) - daysBetween(TODAY, b.startDate));
  }
  return [...list].sort(recruitingFirst);
}

export function ExploreList({ all }: { all: Challenge[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const category = params.get("category");
  const q = params.get("q") ?? "";
  const sortParam = params.get("sort");
  const sort: Sort = sortParam === "popular" ? "인기순" : sortParam === "deadline" ? "마감 임박순" : "최신순";
  const [shown, setShown] = useState(PAGE);

  const list = arrange(all, category, q, sort);

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setShown(PAGE);
    router.replace(`/?${next.toString()}#explore`, { scroll: false });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="카테고리" className="flex flex-wrap gap-2">
          {[null, ...CATEGORIES].map((c) => {
            const active = category === c;
            return (
              <button
                key={c ?? "전체"}
                type="button"
                aria-pressed={active}
                onClick={() => update("category", c)}
                className={`h-[34px] rounded-chip px-3 text-[14px] transition-colors ${
                  active ? "bg-grey-0 font-bold text-grey-97" : "bg-grey-80 text-grey-20 hover:bg-grey-70"
                }`}
              >
                {c ?? "전체"}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-[12px] text-grey-40">
          <span className="sr-only">정렬</span>
          <select
            value={sort}
            onChange={(e) => {
              const v = e.target.value as Sort;
              update("sort", v === "인기순" ? "popular" : v === "마감 임박순" ? "deadline" : null);
            }}
            className="h-[34px] rounded-sm bg-transparent pr-1 text-[12px] text-grey-30"
          >
            {SORTS.map((s) => (
              <option key={s} value={s} className="bg-grey-90">
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {q && (
        <p className="mt-4 text-[14px] text-grey-30">
          ‘{q}’ 검색 결과 {list.length}개{" "}
          <button type="button" onClick={() => update("q", null)} className="ml-2 text-accent-soft underline-offset-2 hover:underline">
            검색어 지우기
          </button>
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        챌린지 {list.length}개
      </p>

      {list.length === 0 ? (
        <div className="mt-6 rounded-md bg-grey-90 px-6 py-12 text-center">
          <p className="text-[16px] font-bold">조건에 맞는 챌린지를 찾지 못했어요.</p>
          <p className="mt-1 text-[14px] text-grey-30">필터를 바꿔 볼까요?</p>
          <Button variant="outline" className="mt-5" onClick={() => router.replace("/#explore", { scroll: false })}>
            전체 챌린지 보기
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.slice(0, shown).map((c) => (
            <li key={c.id}>
              <ChallengeCard c={c} />
            </li>
          ))}
        </ul>
      )}

      {list.length > shown && (
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
            더 보기
          </Button>
        </div>
      )}
    </div>
  );
}

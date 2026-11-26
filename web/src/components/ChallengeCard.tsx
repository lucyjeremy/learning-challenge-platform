import Link from "next/link";
import type { Challenge } from "@/lib/data";
import { badgeOf, fmtDate, phase, priceLabel, shortCount } from "@/lib/format";
import { Badge, Thumb } from "./ui";

export function ChallengeCard({ c, className = "" }: { c: Challenge; className?: string }) {
  const b = badgeOf(c);
  const running = phase(c) === "진행 중";
  return (
    <Link
      href={`/c/${c.id}`}
      className={`group block overflow-hidden rounded-md bg-grey-90 ${className}`}
    >
      <div className="transition-opacity group-hover:opacity-90">
        <Thumb c={c} />
      </div>
      <div className="px-4 pt-3 pb-4">
        <div className="mb-3 flex flex-wrap gap-1">
          <Badge {...b} />
          <Badge label={c.category} kind="category" />
        </div>
        <h3 className="line-clamp-2 text-[16px] leading-normal font-bold">{c.title}</h3>
        <p className="mt-0.5 text-[14px] text-grey-40">{c.instructor.name}</p>
        <p className="mt-2 text-[13px] text-grey-30">
          {c.days}일 · {fmtDate(c.startDate)} {running ? "시작함" : "시작"} ·{" "}
          <span className="tabular-nums">
            {shortCount(c.enrolled)}/{shortCount(c.capacity)}명
          </span>
        </p>
        <p className="mt-1 text-[14px] font-bold">{priceLabel(c.price)}</p>
      </div>
    </Link>
  );
}

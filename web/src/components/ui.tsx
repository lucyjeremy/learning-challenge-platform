import Link from "next/link";
import type { ComponentProps } from "react";
import type { Badge as BadgeT } from "@/lib/format";
import type { Challenge } from "@/lib/data";

const badgeClass: Record<BadgeT["kind"], string> = {
  best: "bg-red-50 border-red-50 text-grey-0",
  status: "bg-transparent border-accent-soft text-accent-soft",
  category: "bg-grey-70 border-grey-70 text-grey-0",
};

export function Badge({ label, kind, title }: BadgeT) {
  const inner = (
    <span
      className={`inline-flex h-[26px] items-center whitespace-nowrap rounded-sm border px-2 text-[12px] leading-6 font-bold tracking-[-0.36px] ${badgeClass[kind]}`}
    >
      {label}
    </span>
  );
  return title ? <abbr title={title} className="no-underline">{inner}</abbr> : inner;
}

/** 이미지가 올라오기 전까지 쓰는 16:10 썸네일. 기간을 크게 보여 주는 포스터 */
export function Thumb({ c, size = "md" }: { c: Challenge; size?: "md" | "lg" }) {
  return (
    <div
      className={`relative overflow-hidden ${size === "lg" ? "aspect-[16/10] sm:aspect-[21/9]" : "aspect-[16/10]"}`}
      style={{ backgroundColor: c.tone }}
      aria-hidden
    >
      <span className="absolute top-3 left-4 text-[12px] font-bold text-white/80">{c.category}</span>
      <span
        className={`absolute bottom-2 left-3 leading-[0.82] font-bold tracking-[-0.04em] text-grey-0 ${
          size === "lg" ? "text-[clamp(96px,14vw,150px)]" : "text-[96px]"
        }`}
      >
        {c.days}
      </span>
      <span
        className={`absolute right-4 bottom-4 text-right font-bold text-grey-0/80 ${
          size === "lg" ? "text-[18px]" : "text-[14px]"
        }`}
      >
        일 동안
        <br />
        매일
      </span>
    </div>
  );
}

type BtnProps = { variant?: "primary" | "light" | "outline" } & (
  | ({ href: string } & Omit<ComponentProps<typeof Link>, "href">)
  | ({ href?: undefined } & ComponentProps<"button">)
);

const btnBase =
  "inline-flex items-center justify-center rounded-sm border font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed";
const btnVariant = {
  primary:
    "h-11 px-5 text-[14px] bg-blue-50 border-blue-50 text-grey-0 disabled:bg-grey-70 disabled:border-grey-70 disabled:text-grey-30",
  light:
    "h-[38px] px-5 text-[12px] tracking-[-0.36px] bg-grey-0 border-grey-0 text-grey-97 active:bg-grey-10 disabled:bg-grey-50 disabled:border-grey-50 disabled:text-grey-0",
  outline:
    "h-[38px] px-5 text-[12px] tracking-[-0.36px] bg-transparent border-grey-20 text-grey-0 active:text-grey-30 disabled:text-grey-50",
};

export function Button({ variant = "primary", className = "", ...props }: BtnProps & { className?: string }) {
  const cls = `${btnBase} ${btnVariant[variant]} ${className}`;
  if (props.href !== undefined) return <Link {...props} className={cls} />;
  return <button type="button" {...(props as ComponentProps<"button">)} className={cls} />;
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-grey-70 font-bold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {name.length === 3 ? name[1] : name[0]}
    </span>
  );
}

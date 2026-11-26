"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "feed", label: "피드" },
  { slug: "curriculum", label: "내 강의실" },
  { slug: "leaderboard", label: "리더보드" },
];

export function HomeTabs({ id }: { id: string }) {
  const path = usePathname();
  return (
    <nav aria-label="챌린지 메뉴" className="sticky top-[106px] z-30 -mx-5 mt-4 border-b border-grey-80 bg-grey-97 px-5">
      <ul className="flex gap-6">
        {TABS.map((t) => {
          const href = `/c/${id}/${t.slug}`;
          const active = path === href || (t.slug === "curriculum" && path.startsWith(`/c/${id}/day/`));
          return (
            <li key={t.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative block h-[43px] px-1 pt-3 pb-2.5 text-[14px] ${
                  active
                    ? "font-bold text-grey-0 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-grey-0"
                    : "text-grey-20 hover:text-grey-0"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

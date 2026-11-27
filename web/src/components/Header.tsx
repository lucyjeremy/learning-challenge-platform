import Link from "next/link";
import { levelOf } from "@/domain/points";
import { CATEGORIES } from "@/lib/data";
import { currentUserId, logoutAction } from "@/server/actions";
import { getUser, pointsOf } from "@/server/store";

export async function Header() {
  const user = getUser(await currentUserId());
  const level = user ? levelOf(pointsOf(user.id)) : 1;
  return (
    <header className="sticky top-0 z-40 bg-grey-100">
      <div className="mx-auto flex h-[58px] max-w-wide items-center gap-6 px-5">
        <Link href="/" className="shrink-0 text-[20px] font-bold tracking-[-0.6px]">
          챌린지업
        </Link>
        <form action="/" role="search" className="hidden h-[34px] w-[290px] items-center gap-1 rounded-pill bg-[#f2f2f2] py-[5px] pr-[9px] pl-[6px] sm:flex">
          <SearchIcon />
          <label htmlFor="q" className="sr-only">챌린지 검색</label>
          <input
            id="q"
            name="q"
            type="search"
            maxLength={50}
            placeholder="어떤 챌린지를 찾으시나요?"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[#333333] placeholder:text-tag-text focus:outline-none"
          />
        </form>
        <nav aria-label="내 메뉴" className="ml-auto flex items-center gap-5 text-[14px]">
          {user ? (
            <>
              <Link href="/#today" className="hidden text-grey-20 hover:text-grey-0 sm:inline">내 챌린지</Link>
              <span className="flex items-center gap-2">
                <span aria-hidden className="grid size-7 place-items-center rounded-full bg-grey-70 text-[12px] font-bold">
                  {user.name.slice(0, 1)}
                </span>
                <span className="hidden sm:inline">{user.name}</span>
                <abbr title={`레벨 ${level}`} className="rounded-sm bg-grey-80 px-1.5 text-[11px] font-bold no-underline">
                  Lv{level}
                </abbr>
              </span>
              <form action={logoutAction}>
                <button type="submit" className="inline-flex min-h-11 items-center text-[13px] text-grey-40 hover:text-grey-0">로그아웃</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex min-h-11 items-center text-grey-20 hover:text-grey-0">로그인</Link>
              <Link href="/signup" className="inline-flex min-h-11 items-center rounded-sm bg-blue-50 px-3 text-[13px] font-bold">회원가입</Link>
            </>
          )}
        </nav>
      </div>
      <nav aria-label="카테고리" className="no-scrollbar mx-auto flex h-12 max-w-wide items-center overflow-x-auto whitespace-nowrap px-3">
        <Link href="/#explore" className="px-[17px] py-2 text-[14px] font-bold">전체</Link>
        <Link href="/?sort=deadline#explore" className="px-[17px] py-2 text-[14px] font-bold">🔥 마감 임박</Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={`/?category=${encodeURIComponent(c)}#explore`} className="px-[17px] py-2 text-[14px] text-grey-20 hover:text-grey-0">
            {c}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0 stroke-[#333333]" fill="none" strokeWidth={1.8} aria-hidden>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  );
}

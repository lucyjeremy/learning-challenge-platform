import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 bg-grey-80 px-5 py-10 text-grey-20">
      <div className="mx-auto flex max-w-content flex-col gap-6">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
          <li><Link href="/" className="hover:text-grey-0">챌린지 둘러보기</Link></li>
          <li><Link href="/login" className="hover:text-grey-0">로그인</Link></li>
          <li><Link href="/signup" className="hover:text-grey-0">회원가입</Link></li>
        </ul>
        <div>
          <p className="text-[14px] font-bold text-grey-0">챌린지업</p>
          <p className="mt-1 text-[12px] text-grey-30">
            매일 강의 하나, 미션 하나. 모든 마감 시간은 한국 시간 기준이에요.
          </p>
        </div>
        <p className="text-[11px] text-grey-30">© 2026 챌린지업</p>
      </div>
    </footer>
  );
}

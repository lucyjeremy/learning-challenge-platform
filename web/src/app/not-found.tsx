import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-content px-5 py-24 text-center">
      <p className="text-[12px] font-bold tracking-[0.7px] text-grey-40">404</p>
      <h1 className="mt-2 text-[20px] font-bold">페이지를 찾지 못했어요</h1>
      <p className="mt-1 text-[14px] text-grey-30">주소를 다시 확인해 주세요.</p>
      <Link href="/" className="mt-6 inline-flex h-[38px] items-center rounded-sm bg-grey-0 px-5 text-[12px] font-bold text-grey-97">
        챌린지 둘러보기
      </Link>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Thumb, Avatar } from "@/components/ui";
import { EnrollButton } from "@/components/EnrollButton";
import { challenges, getChallenge, TODAY } from "@/lib/data";
import { currentUserId } from "@/server/actions";
import { isMemberOf } from "@/server/store";
import { addDays, badgeOf, daysBetween, endDate, fmtDate, phase, priceLabel, requiredCheckins } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return challenges.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/c/[id]">): Promise<Metadata> {
  const c = getChallenge((await params).id);
  return c ? { title: c.title, description: c.summary } : {};
}

export default async function AboutPage({ params }: PageProps<"/c/[id]">) {
  const c = getChallenge((await params).id);
  if (!c) notFound();

  const p = phase(c);
  const left = c.capacity - c.enrolled;
  const dDay = daysBetween(TODAY, c.startDate);
  const need = requiredCheckins(c);
  const member = isMemberOf(await currentUserId(), c.id);
  const preview = c.dayTitles.slice(0, 7);

  return (
    <div className="mx-auto max-w-content px-5 pt-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <p className="text-[16px] text-grey-20">{c.category}</p>
          <h1 className="mt-1 text-[30px] leading-[1.3] font-bold">{c.title}</h1>
          <p className="mt-3 text-[16px] text-grey-20">{c.summary}</p>

          <div className="mt-6 overflow-hidden rounded-md">
            <Thumb c={c} size="lg" />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Avatar name={c.instructor.name} size={44} />
            <div>
              <p className="text-[14px] font-bold">{c.instructor.name}</p>
              <p className="text-[13px] text-grey-40">{c.instructor.bio}</p>
            </div>
          </div>

          <section aria-labelledby="info" className="mt-10">
            <h2 id="info" className="text-[20px] font-bold">챌린지 상세 정보</h2>
            <dl className="mt-4 grid grid-cols-[96px_1fr] gap-y-3 text-[14px]">
              <dt className="text-grey-40">기간</dt>
              <dd>
                {fmtDate(c.startDate)} ~ {fmtDate(endDate(c))} · {c.days}일
              </dd>
              <dt className="text-grey-40">완주 조건</dt>
              <dd>
                {c.days}일 중 {need}일 인증하면 완주
              </dd>
              <dt className="text-grey-40">인증 방법</dt>
              <dd>
                {c.format === "체크" ? "‘완료했어요’ 누르기" : `${c.format}로 인증`} ·{" "}
                {c.approval === "자동 인정" ? "올리면 바로 인정돼요" : "강사가 확인하면 인정돼요"}
              </dd>
              <dt className="text-grey-40">마감</dt>
              <dd>매일 23:59 (한국 시간)</dd>
              <dt className="text-grey-40">정원</dt>
              <dd>{c.capacity}명</dd>
              <dt className="text-grey-40">가격</dt>
              <dd>{priceLabel(c.price)}</dd>
            </dl>
          </section>

          <section aria-labelledby="intro" className="mt-10">
            <h2 id="intro" className="text-[20px] font-bold">소개</h2>
            <div className="mt-4 text-[15px] leading-[1.75] whitespace-pre-line text-grey-20">{c.intro}</div>
          </section>

          <section aria-labelledby="curriculum" className="mt-10">
            <h2 id="curriculum" className="text-[20px] font-bold">커리큘럼</h2>
            <p className="mt-1 text-[14px] text-grey-40">
              {member ? "챌린지 홈에서 Day별 강의와 미션을 볼 수 있어요." : "신청하면 Day별 강의와 미션을 볼 수 있어요."}
            </p>
            <ol className="mt-4 divide-y divide-grey-80 rounded-md bg-grey-90">
              {preview.map((t, i) => (
                <li key={t} className="flex items-center gap-4 px-4 py-3 text-[14px]">
                  <span className="w-12 shrink-0 text-[12px] font-bold text-grey-40 tabular-nums">Day {i + 1}</span>
                  <span className="flex-1">{t}</span>
                  {!member && <LockIcon />}
                </li>
              ))}
              {c.days > preview.length && (
                <li className="px-4 py-3 text-[13px] text-grey-40">
                  Day {preview.length + 1} ~ Day {c.days}까지 이어져요
                </li>
              )}
            </ol>
          </section>
        </div>

        <aside aria-label="신청" className="lg:sticky lg:top-[130px] lg:self-start">
          <div className="rounded-md bg-grey-90 p-5">
            <div className="flex flex-wrap gap-1">
              <Badge {...badgeOf(c)} />
            </div>
            <p className="mt-3 text-[24px] font-bold">{priceLabel(c.price)}</p>
            <dl className="mt-4 space-y-2 text-[14px]">
              <Row label="참여 인원" value={`${c.enrolled} / ${c.capacity}명`} />
              {p === "모집 중" && <Row label="남은 자리" value={left > 0 ? `${left}자리` : "없어요"} />}
              {p === "모집 중" && (
                <Row label="시작까지" value={dDay === 0 ? "오늘 시작해요" : `${dDay}일 남았어요`} />
              )}
              {p === "진행 중" && (
                <Row label="진행" value={`Day ${daysBetween(c.startDate, TODAY) + 1} / ${c.days}`} />
              )}
            </dl>
            <Cta id={c.id} member={member} phase={p} full={left <= 0} start={fmtDate(c.startDate)} />
            {p === "모집 중" && left > 0 && !member && (
              <p className="mt-3 text-[12px] text-grey-30">
                모집은 {fmtDate(addDays(c.startDate, -1))} 23:59 (한국 시간)에 마감돼요.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-grey-40">{label}</dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function Cta({ id, member, phase, full, start }: { id: string; member: boolean; phase: string; full: boolean; start: string }) {
  const cls = "mt-5 w-full";
  if (member) return <Button href={`/c/${id}/feed`} className={cls}>챌린지 홈으로</Button>;
  if (phase !== "모집 중") return <Button disabled className={cls}>모집이 끝났어요</Button>;
  if (full) return <Button disabled className={cls}>정원 마감</Button>;
  return <EnrollButton id={id} startDate={start} className={cls} />;
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 stroke-grey-50" fill="none" strokeWidth={1.8} aria-label="잠김" role="img">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

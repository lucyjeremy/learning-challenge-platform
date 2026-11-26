"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { passwordProblem } from "@/domain/validation";
import { loginAction, signupAction } from "@/server/actions";

const field = "mt-1 h-11 w-full rounded-sm bg-grey-90 px-3 text-[14px] placeholder:text-grey-50 aria-[invalid=true]:outline aria-[invalid=true]:outline-1 aria-[invalid=true]:outline-accent-soft";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ServerError({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-4 rounded-sm bg-grey-80 px-4 py-3 text-[13px] text-grey-20">
      {message}
    </p>
  );
}

/** 로그인 뒤 돌아갈 주소. 같은 사이트 경로만 허용해요. */
function useNext() {
  const next = useSearchParams().get("next") ?? "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const next = useNext();
  const emailBad = !EMAIL.test(email);
  const pwBad = pw.length === 0;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (emailBad || pwBad) return;
        setError("");
        start(async () => {
          const r = await loginAction(email, pw);
          if (!r.ok) return setError(r.message);
          router.push(next);
          router.refresh();
        });
      }}
    >
      <label htmlFor="email" className="text-[13px] text-grey-30">이메일</label>
      <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={tried && emailBad} aria-describedby="email-err" className={field} />
      {tried && emailBad && <p id="email-err" className="mt-1 text-[12px] text-accent-soft">이메일 주소를 확인해 주세요</p>}

      <label htmlFor="pw" className="mt-4 block text-[13px] text-grey-30">비밀번호</label>
      <input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && pwBad} aria-describedby="pw-err" className={field} />
      {tried && pwBad && <p id="pw-err" className="mt-1 text-[12px] text-accent-soft">비밀번호를 넣어 주세요</p>}

      <button type="submit" disabled={pending} className="mt-6 h-11 w-full rounded-sm bg-blue-50 text-[14px] font-bold disabled:bg-grey-70">
        {pending ? "로그인하는 중" : "로그인"}
      </button>
      {error && <ServerError message={error} />}

      <div className="mt-4 rounded-sm bg-grey-90 px-4 py-3 text-[12px] leading-relaxed text-grey-30">
        <p className="font-bold text-grey-20">체험용 계정 (비밀번호 demo1234)</p>
        <p>학생 student@demo.test · 강사 instructor@demo.test</p>
      </div>

      <p className="mt-5 text-center text-[13px] text-grey-30">
        처음 왔나요? <Link href="/signup" className="text-grey-0 underline-offset-2 hover:underline">회원가입</Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [v, setV] = useState({ email: "", pw: "", pw2: "", name: "" });
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const next = useNext();

  const errs = {
    email: !EMAIL.test(v.email) ? "이메일 주소를 확인해 주세요" : "",
    pw: passwordProblem(v.pw) ?? "",
    pw2: v.pw2 !== v.pw || !v.pw2 ? "비밀번호가 서로 달라요" : "",
    name: v.name.trim().length < 2 || v.name.trim().length > 20 ? "이름은 2~20자로 적어 주세요" : "",
  };
  const badCount = Object.values(errs).filter(Boolean).length;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  const Field = ({ id, label, type, auto, help }: { id: keyof typeof v; label: string; type: string; auto: string; help?: string }) => {
    const show = tried && errs[id];
    return (
      <div className="mt-4 first:mt-0">
        <label htmlFor={id} className="text-[13px] text-grey-30">{label}</label>
        <input id={id} type={type} autoComplete={auto} value={v[id]} onChange={set(id)} aria-invalid={!!show} aria-describedby={`${id}-help`} className={field} />
        {(show || help) && (
          <p id={`${id}-help`} className={`mt-1 text-[12px] ${show ? "text-accent-soft" : "text-grey-40"}`}>{show || help}</p>
        )}
      </div>
    );
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (badCount > 0 || !terms || !privacy) return;
        setError("");
        start(async () => {
          const r = await signupAction({ email: v.email, password: v.pw, passwordConfirm: v.pw2, name: v.name, agreed: terms && privacy });
          if (!r.ok) return setError(r.message);
          router.push(next);
          router.refresh();
        });
      }}
    >
      {Field({ id: "email", label: "이메일", type: "email", auto: "email" })}
      {Field({ id: "pw", label: "비밀번호", type: "password", auto: "new-password", help: "영문과 숫자를 함께 넣어 주세요 (8~72자)" })}
      {Field({ id: "pw2", label: "비밀번호 확인", type: "password", auto: "new-password" })}
      {Field({ id: "name", label: "이름", type: "text", auto: "name", help: "피드와 순위표에 보이는 이름이에요" })}

      <div className="mt-6 space-y-2 text-[14px]">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="size-4 accent-blue-50" />
          이용약관에 동의해요 <span className="text-[12px] text-grey-40">(필수)</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="size-4 accent-blue-50" />
          개인정보 수집·이용에 동의해요 <span className="text-[12px] text-grey-40">(필수)</span>
        </label>
      </div>

      {tried && badCount > 0 && (
        <p role="alert" className="mt-4 text-[13px] text-accent-soft">표시한 {badCount}곳을 고쳐 주세요</p>
      )}

      <button
        type="submit"
        disabled={!terms || !privacy || pending}
        className="mt-6 h-11 w-full rounded-sm bg-blue-50 text-[14px] font-bold disabled:bg-grey-70 disabled:text-grey-30"
      >
        {pending ? "가입하는 중" : "가입하기"}
      </button>
      {error && <ServerError message={error} />}

      <p className="mt-5 text-center text-[13px] text-grey-30">
        이미 가입했나요? <Link href="/login" className="text-grey-0 underline-offset-2 hover:underline">로그인</Link>
      </p>
    </form>
  );
}

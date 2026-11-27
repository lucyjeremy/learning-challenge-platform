// AC-01 나머지 폼: 가입·로그인·인증 제출. 첫 서버 액션 요청을 끊고 → 입력 유지·안내·재시도 확인
import { chromium } from "playwright";
const PW = process.env.E2E_PASSWORD;
if (!PW) throw new Error("E2E_PASSWORD 환경 변수에 QA 계정 비밀번호를 넣어 주세요");
const BASE = "https://learning-challenge-platform-virid.vercel.app";
const out = process.argv[2] || "e2e-out";
const USER = process.argv[3] || "qa-sub-d@demo.test";
const b = await chromium.launch();
const alertOf = async (p) => {
  const a = p.locator("[role=alert]:not(#__next-route-announcer__)").filter({ hasText: /\S/ });
  try { await a.first().waitFor({ timeout: 8000 }); return (await a.first().innerText()).trim(); } catch { return null; }
};
const newPage = async () => {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.block = false;
  await p.route("**/*", (r) => {
    const q = r.request();
    if (p.block && q.method() === "POST" && q.headers()["next-action"]) { p.block = false; return r.abort("internetdisconnected"); }
    return r.continue();
  });
  return p;
};

// 1. 가입
{
  const p = await newPage();
  const email = `qa-ac01-${Date.now()}@demo.test`;
  await p.goto(`${BASE}/signup`);
  await p.getByLabel("이메일").fill(email);
  await p.getByLabel("비밀번호", { exact: true }).fill(PW);
  await p.getByLabel("이름").fill("AC01가입");
  await p.getByLabel(/이용약관에 동의해요/).check();
  await p.getByLabel(/개인정보 수집/).check();
  p.block = true;
  await p.getByRole("button", { name: "가입하기" }).click();
  const r = { alert: await alertOf(p) };
  await p.screenshot({ path: `${out}/signup-fail.png` });
  r.kept = (await p.getByLabel("이메일").inputValue()) === email && (await p.getByLabel("비밀번호", { exact: true }).inputValue()) === PW && (await p.getByLabel("이름").inputValue()) === "AC01가입" && (await p.getByLabel(/이용약관에 동의해요/).isChecked()) && (await p.getByLabel(/개인정보 수집/).isChecked());
  r.enabled = await p.getByRole("button", { name: "가입하기" }).isEnabled();
  await p.getByRole("button", { name: "가입하기" }).click();
  r.retryOk = await p.waitForURL(`${BASE}/`, { timeout: 30000 }).then(() => true, () => false);
  console.log("가입", JSON.stringify(r));
  await p.context().close();
}

// 2. 로그인 → 3. 인증 제출
{
  const p = await newPage();
  await p.goto(`${BASE}/login`);
  await p.getByLabel("이메일").fill(USER);
  await p.getByLabel("비밀번호").fill(PW);
  p.block = true;
  await p.getByRole("button", { name: "로그인" }).click();
  const r = { alert: await alertOf(p) };
  await p.screenshot({ path: `${out}/login-fail.png` });
  r.kept = (await p.getByLabel("이메일").inputValue()) === USER && (await p.getByLabel("비밀번호").inputValue()) === PW;
  r.enabled = await p.getByRole("button", { name: "로그인" }).isEnabled();
  await p.getByRole("button", { name: "로그인" }).click();
  r.retryOk = await p.waitForURL(`${BASE}/`, { timeout: 30000 }).then(() => true, () => false);
  console.log("로그인", JSON.stringify(r));

  const c = {};
  for (const day of [9, 8]) {
    await p.goto(`${BASE}/c/python-21/day/${day}`);
    if (await p.locator("#body").count()) { c.day = day; break; }
  }
  if (!c.day) {
    c.note = "오늘·어제 Day가 이미 인증돼 폼 없음";
  } else {
    const text = `AC01 인증 점검 ${Date.now()} print("hello")`;
    await p.locator("#body").fill(text);
    p.block = true;
    await p.getByRole("button", { name: "인증하기" }).click();
    c.alert = await alertOf(p);
    await p.screenshot({ path: `${out}/checkin-fail.png` });
    c.kept = (await p.locator("#body").inputValue()) === text;
    c.enabled = await p.getByRole("button", { name: "인증하기" }).isEnabled();
    await p.getByRole("button", { name: "인증하기" }).click();
    c.retryOk = await p.locator("#body").waitFor({ state: "detached", timeout: 30000 }).then(() => true, () => false);
    await p.screenshot({ path: `${out}/checkin-retry.png` });
    await p.goto(`${BASE}/c/python-21/feed`);
    c.feedPosts = await p.locator("article").filter({ hasText: text }).count();
  }
  console.log("인증", JSON.stringify(c));
  await p.context().close();
}
await b.close();

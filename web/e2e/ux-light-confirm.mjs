// 라이트 모드·자체 확인창·비밀번호 보기 운영 확인
import { chromium } from "playwright";
const PW = process.env.E2E_PASSWORD;
if (!PW) throw new Error("E2E_PASSWORD 환경 변수에 QA 계정 비밀번호를 넣어 주세요");
import AxeBuilder from "@axe-core/playwright";
const BASE = "https://learning-challenge-platform-virid.vercel.app";
const out = process.argv[2] || "e2e-out";
const b = await chromium.launch();
const log = (...a) => console.log(...a);

// 0. 새 배포 대기: 가입 화면에 '보기' 버튼이 생길 때까지
{
  const p = await b.newPage();
  for (let i = 0; i < 40; i++) {
    await p.goto(`${BASE}/signup`);
    if (await p.getByRole("button", { name: "보기" }).count()) break;
    await p.waitForTimeout(15000);
  }
  log("배포 반영:", (await p.getByRole("button", { name: "보기" }).count()) > 0);
  await p.close();
}

// 1. 라이트 모드 색 대비 + 스크린샷
{
  const ctx = await b.newContext({ colorScheme: "light", viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  for (const [name, path] of [["home", "/"], ["intro", "/c/python-21"], ["signup", "/signup"], ["lb", "/c/python-21/leaderboard"]]) {
    await p.goto(BASE + path);
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const r = await new AxeBuilder({ page: p }).withRules(["color-contrast"]).analyze();
    log(`라이트 ${name}: 배경 ${bg}, 대비 위반 ${r.violations.reduce((n, v) => n + v.nodes.length, 0)}`);
    for (const v of r.violations) for (const n of v.nodes.slice(0, 3)) log("  ", n.target.join(" "), n.any[0]?.message?.slice(0, 90));
    await p.screenshot({ path: `${out}/light-${name}.png`, fullPage: true });
  }
  await ctx.close();
}

// 2. 가입 '보기' 토글
{
  const p = await b.newPage();
  await p.goto(`${BASE}/signup`);
  const pw = p.getByLabel("비밀번호", { exact: true });
  await pw.fill(PW);
  const t0 = await pw.getAttribute("type");
  await p.getByRole("button", { name: "보기" }).click();
  const t1 = await pw.getAttribute("type");
  const pressed = await p.getByRole("button", { name: "숨기기" }).getAttribute("aria-pressed");
  const confirmField = await p.getByLabel("비밀번호 확인").count();
  log(`보기 토글: ${t0} → ${t1}, aria-pressed=${pressed}, 비밀번호 확인 칸 ${confirmField}개`);
  await p.close();
}

// 3. 자체 확인창: 글쓰기 닫기(계속 쓰기/나가기), 글 삭제(닫기/삭제하기)
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  let native = 0;
  p.on("dialog", (d) => { native++; d.dismiss(); });
  await p.goto(`${BASE}/login?next=${encodeURIComponent("/c/python-21/feed")}`);
  await p.getByLabel("이메일").fill("qa-sub-b@demo.test");
  await p.getByLabel("비밀번호").fill(PW);
  await p.getByRole("button", { name: "로그인" }).click();
  await p.waitForURL(`${BASE}/c/python-21/feed`, { timeout: 20000 });
  for (const old of await p.locator("article").filter({ hasText: "확인창 점검" }).all()) {
    await old.getByRole("button", { name: "글 메뉴" }).click();
    await p.getByRole("menuitem", { name: "삭제하기" }).click();
    await p.getByRole("dialog", { name: "이 글을 삭제할까요?" }).getByRole("button", { name: "삭제하기" }).click();
    await p.waitForTimeout(3000);
  }
  const stamp = `확인창 점검 ${Date.now()}`;
  await p.getByRole("button", { name: "글쓰기" }).first().click();
  await p.locator("#post-title").fill(stamp);
  await p.locator("#post-body").fill("자체 확인창 동작을 점검하는 글이에요. 곧 지워요.");
  await p.getByRole("button", { name: "닫기" }).first().click();
  const d1 = p.getByRole("dialog", { name: "작성 중인 내용이 사라져요" });
  await d1.waitFor({ timeout: 5000 });
  const btns1 = await d1.getByRole("button").allInnerTexts();
  await p.screenshot({ path: `${out}/confirm-close.png` });
  await d1.getByRole("button", { name: "계속 쓰기" }).click();
  const kept = await p.locator("#post-title").inputValue();
  log(`글쓰기 닫기 확인창 버튼 [${btns1.join(", ")}], 계속 쓰기 후 제목 유지: ${kept === stamp}`);
  await p.getByRole("button", { name: "게시하기" }).click();
  const card = p.locator("article").filter({ hasText: stamp }).first();
  await card.waitFor({ timeout: 20000 });
  await card.getByRole("button", { name: "글 메뉴" }).click();
  await p.getByRole("menuitem", { name: "삭제하기" }).click();
  const d2 = p.getByRole("dialog", { name: "이 글을 삭제할까요?" });
  await d2.waitFor({ timeout: 5000 });
  const btns2 = await d2.getByRole("button").allInnerTexts();
  await p.screenshot({ path: `${out}/confirm-delete.png` });
  await d2.getByRole("button", { name: "닫기" }).click();
  const still = await card.isVisible();
  await card.getByRole("button", { name: "글 메뉴" }).click();
  await p.getByRole("menuitem", { name: "삭제하기" }).click();
  await d2.getByRole("button", { name: "삭제하기" }).click();
  await p.locator("article").filter({ hasText: stamp }).first().waitFor({ state: "detached", timeout: 20000 });
  log(`삭제 확인창 버튼 [${btns2.join(", ")}], 닫기 후 글 유지: ${still}, 삭제하기 후 글 사라짐: true, 브라우저 기본창 ${native}회`);
  await ctx.close();
}
await b.close();

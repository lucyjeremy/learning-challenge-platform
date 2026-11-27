// AC-01: 저장 요청이 실패해도 입력이 남고, 안내가 보이고, 재시도하면 한 건만 생긴다
// 실패 입력: 서버 액션 POST(next-action 헤더)를 첫 번째만 끊는다
import { chromium } from "playwright";
const PW = process.env.E2E_PASSWORD;
if (!PW) throw new Error("E2E_PASSWORD 환경 변수에 QA 계정 비밀번호를 넣어 주세요");
const BASE = process.env.BASE || "https://learning-challenge-platform-virid.vercel.app";
const out = process.argv[2] || "e2e-out";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const res = {};
let block = false;
await p.route("**/*", (r) => {
  const req = r.request();
  if (block && req.method() === "POST" && req.headers()["next-action"]) { block = false; return r.abort("internetdisconnected"); }
  return r.continue();
});
const alertText = async () => {
  const a = p.locator("[role=alert]:not(#__next-route-announcer__)").filter({ hasText: /\S/ });
  try { await a.first().waitFor({ timeout: 8000 }); return (await a.first().innerText()).trim(); } catch { return null; }
};

await p.goto(`${BASE}/login?next=${encodeURIComponent("/c/python-21/feed")}`);
await p.getByLabel("이메일").fill("qa-sub-c@demo.test");
await p.getByLabel("비밀번호").fill(PW);
await p.getByRole("button", { name: "로그인" }).click();
await p.waitForURL(`${BASE}/c/python-21/feed`, { timeout: 20000 });

// 이전 실행에서 남은 점검 글 정리
for (const old of await p.locator("article").filter({ hasText: "AC01 점검" }).all()) {
  await old.getByRole("button", { name: "글 메뉴" }).click();
  await p.getByRole("menuitem", { name: "삭제하기" }).click();
  await p.getByRole("dialog", { name: "이 글을 삭제할까요?" }).getByRole("button", { name: "삭제하기" }).click();
  await p.waitForTimeout(2500);
}

const stamp = `AC01 점검 ${Date.now()}`;
const body = "저장 요청이 끊겨도 입력이 남는지 확인하는 글이에요.";
await p.getByRole("button", { name: "글쓰기" }).first().click();
await p.locator("#post-title").fill(stamp);
await p.locator("#post-body").fill(body);
block = true;
await p.getByRole("button", { name: "게시하기" }).click();
res.alert = await alertText();
await p.screenshot({ path: `${out}/ac01-fail.png` });
const editorOpen = await p.locator("#post-title").isVisible().catch(() => false);
res.titleKept = editorOpen && (await p.locator("#post-title").inputValue()) === stamp;
res.bodyKept = editorOpen && (await p.locator("#post-body").inputValue()) === body;
res.buttonEnabled = editorOpen && (await p.getByRole("button", { name: "게시하기" }).isEnabled());
res.errorPage = await p.getByText(/Application error|client-side exception|문제가 생겼어요/).count();

if (res.buttonEnabled) {
  await p.getByRole("button", { name: "게시하기" }).click();
  await p.locator("#post-title").waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  await p.reload();
  res.created = await p.locator("article").filter({ hasText: stamp }).count();
  // 정리
  if (res.created) {
    const card = p.locator("article").filter({ hasText: stamp }).first();
    await card.getByRole("button", { name: "글 메뉴" }).click();
    await p.getByRole("menuitem", { name: "삭제하기" }).click();
    await p.getByRole("dialog", { name: "이 글을 삭제할까요?" }).getByRole("button", { name: "삭제하기" }).click();
    await p.waitForTimeout(2500);
  }
}
console.log(JSON.stringify(res));
await b.close();

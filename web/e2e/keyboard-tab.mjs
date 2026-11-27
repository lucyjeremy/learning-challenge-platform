import { chromium } from "playwright";
const BASE = "https://learning-challenge-platform-virid.vercel.app";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const cur = () => p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; e.dataset.t ??= Math.random().toString(36).slice(2); return e.dataset.t; });
for (const path of ["/", "/signup", "/login", "/c/python-21"]) {
  await p.goto(BASE + path);
  const fwd = [];
  for (let i = 0; i < 80; i++) { await p.keyboard.press("Tab"); const t = await cur(); if (!t || fwd.includes(t)) break; fwd.push(t); }
  const back = [];
  for (let i = 0; i < fwd.length; i++) { await p.keyboard.press("Shift+Tab"); back.push(await cur()); }
  const ok = back.join() === [...fwd].reverse().join();
  const missed = await p.evaluate(() => [...document.querySelectorAll("a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea")]
    .filter((e) => e.getClientRects().length && !e.dataset.t && e.tabIndex >= 0 && getComputedStyle(e).visibility !== "hidden")
    .map((e) => `${e.tagName}:${(e.getAttribute("aria-label") || e.textContent || e.name || e.type || "").trim().slice(0, 15)}`));
  console.log(`${path}: Tab 도달 ${fwd.length}개, Shift+Tab 역순 일치 ${ok}, 못 닿은 요소 ${missed.length}개 ${missed.slice(0, 6).join(" / ")}`);
}
await b.close();

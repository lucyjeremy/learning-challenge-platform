# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

This is the workspace for **챌린지업 (ChallengeUp)**, an online lecture-challenge site. The front end lives in `web/` (Next.js 16 App Router, Tailwind v4). It runs on seed data in `web/src/lib/data.ts`; Supabase is not connected yet, so enrolling, posting and check-ins are kept in the browser only.

- Install: `npm install --prefix web`
- Dev server: `npm run dev --prefix web`
- Build: `npm run build --prefix web` (all pages are prerendered statically)
- Lint: `npm run lint --prefix web`
- Next.js 16 differs from older versions; read `web/node_modules/next/dist/docs/` before using an API you are unsure of.

## Product concept

- Instructors register fixed-length, cohort-based challenges, for example "21일 파이썬 기초". Students enroll, watch a lecture each day, and submit a check-in for that day's mission. Students who meet the completion rule (for example, 80% of missions submitted) complete the challenge.
- The reference site is https://www.skool.com/. Each challenge reuses Skool's layout: a feed (커뮤니티), a curriculum (Classroom), a calendar, a leaderboard with points and levels, members, and an About landing page. Unlike Skool, a challenge has a start date and an end date and runs as a cohort, not an ongoing subscription.
- A challenge moves through these stages: 작성 중 → 검수 대기 → 모집 중 → 진행 중 → 종료 → 정산 완료.
- The user writes in Korean. Use Korean for UI copy and for replies.

## Planned stack (not yet set up)

- Next.js App Router, Tailwind and shadcn/ui
- Supabase for auth, Postgres, storage and realtime; the Supabase MCP needs `/mcp` authorization before use
- Vercel for deployment

## Planned data model

The core tables are `users`, `challenges`, `missions` (one per Day), `enrollments`, `submissions`, `posts`, `comments`, `likes` and `point_logs`. Later phases add `events`, `certificates`, `reviews` and `payments`.

- Points are an append-only log in `point_logs`. Leaderboards and levels are computed from this log.
- A submission (mission check-in) also shows up as a post in the challenge feed.

## MVP scope

- Included: auth, instructor registration through a 5-step wizard, browsing challenges, free enrollment, today's mission and check-in, the feed, points and leaderboard, the instructor dashboard, and marking students as completed.
- Not in the MVP: payments (Toss Payments), deposit refunds, certificate PDFs and email notifications. These are planned for phase 2.

## Behavioral guidelines

These guidelines reduce common LLM coding mistakes. They favor caution over speed; for trivial tasks, use judgment.

### 1. Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them instead of picking one silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop, name what's confusing, and ask.

### 2. Simplicity first

Write the minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No flexibility or configurability that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself whether a senior engineer would call it overcomplicated. If yes, simplify.

### 3. Surgical changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments or formatting.
- Don't refactor things that aren't broken.
- Match the existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it; don't delete it.
- Remove imports, variables and functions that your own changes made unused. Leave pre-existing dead code unless asked.

Every changed line should trace directly to the user's request.

### 4. Goal-driven execution

Define success criteria, then loop until they are verified.

- "Add validation" → write tests for invalid inputs, then make them pass.
- "Fix the bug" → write a test that reproduces it, then make it pass.
- "Refactor X" → make sure tests pass before and after.

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you work independently. Weak ones ("make it work") need constant clarification.

The guidelines are working if diffs have fewer unnecessary changes, fewer rewrites come from overcomplication, and clarifying questions come before implementation rather than after mistakes.

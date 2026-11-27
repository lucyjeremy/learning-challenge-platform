# 챌린지업 (ChallengeUp)

같은 기수와 정해진 기간 동안 매일 강의를 보고 미션을 인증하며 완주하는 온라인 강의 챌린지 서비스예요.

- 운영: https://learning-challenge-platform-virid.vercel.app
- 구성: Next.js 16 App Router · Tailwind v4 (`web/`) · Supabase Auth/Postgres (서울) · Vercel (icn1) · 그로블 결제 웹훅 · GA4

## 실행

```bash
npm install --prefix web
cp web/.env.example web/.env.local   # 값은 Supabase·그로블 콘솔에서 받아 채워요
npm run dev --prefix web
```

환경 변수가 없으면 메모리 모드로 돌아가요. 이때 가입·신청·인증은 서버가 다시 시작되면 사라져요.

## 검증

| 명령 | 내용 |
|---|---|
| `node scripts/verify.mjs` | 빠른 검사 (`git diff --check`) |
| `node scripts/verify.mjs --full` | lint · typecheck · 단위 테스트(Vitest) |
| `web/e2e/*.mjs` | 운영 E2E (`web/e2e/README.md`) |

PR을 올리면 GitHub Actions(`.github/workflows/verify.yml`)가 전체 검사를 실행해요.

## 지금 범위 (MVP)

- 들어 있음: 이메일 가입·로그인, 챌린지 탐색·소개, 무료 신청(정원·중복·동시 5개 제한), Day 열람과 텍스트·링크·체크 인증(23:59 마감), 피드(글·좋아요·삭제), 포인트·스트릭·리더보드, 라이트·다크 모드, 그로블 결제 완료 시 자동 신청
- 아직 없음: 강사 등록·검수, 강사 대시보드, 완주 판정, 사진 인증, 마이페이지, 소셜 로그인

## 문서

- 공통 작업 규칙: `AGENTS.md` (Claude Code는 `CLAUDE.md`)
- 단계별 산출물: `waterfall/` (요구사항 → 설계 → 구현 → 테스트 → 배포 → 검토)
- QA 기준과 인계: `docs/qa/`, UI 검토 Skill: `.claude/skills/uiux-check/`

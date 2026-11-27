# AGENTS.md — 챌린지업 공통 작업 규칙

Claude Code·Codex 등 이 저장소에서 일하는 모든 코딩 에이전트가 따르는 규칙이에요. Claude Code는 `CLAUDE.md`가 이 파일을 불러와요.

## 프로젝트

- 챌린지업: 기수형 온라인 강의 챌린지 (Next.js 16 App Router, Tailwind v4, Supabase, Vercel 서울 icn1)
- 앱 `web/`, DB 마이그레이션 `supabase/migrations/`, 산출물 `waterfall/`, QA `docs/qa/`, 운영 E2E `web/e2e/`
- 운영: https://learning-challenge-platform-virid.vercel.app (main에 push하면 자동 배포)

## 명령

| 할 일 | 명령 |
|---|---|
| 설치 | `npm install --prefix web` |
| 개발 서버 | `npm run dev --prefix web` |
| 빠른 검사 (공백 오류) | `node scripts/verify.mjs` |
| 전체 검사 (lint·typecheck·test) | `node scripts/verify.mjs --full` |
| 빌드 | `npm run build --prefix web` |
| 운영 E2E | `web/e2e/README.md` 참고 (`E2E_PASSWORD` 필요) |

Next.js 16은 예전 버전과 API가 달라요. 확실하지 않은 API는 `web/node_modules/next/dist/docs/`를 먼저 읽어요.

## 수정 범위

- 요청과 관련된 파일만 고쳐요. 이웃 코드의 정리·리팩터링은 하지 않고, 발견한 것만 보고해요.
- 서버 규칙은 `web/src/server/store.ts`에 있어요. 화면에서만 막는 규칙을 새로 만들지 않아요.
- DB 접근은 서버에서 service_role로만 해요. 클라이언트에 키를 넘기거나 `NEXT_PUBLIC_`에 비밀값을 넣지 않아요.
- 서버 액션 호출은 `safeAction()`으로 감싸서, 요청이 실패해도 입력이 남고 안내가 보이게 해요.
- 비밀값(`.env.local`, Vercel 환경 변수)은 커밋하지 않아요. 새 변수는 이름만 `web/.env.example`에 적어요.

## 검증과 보고

- 끝났다고 말하기 전에 `node scripts/verify.mjs --full`을 실행하고 결과를 적어요.
- 화면 변경은 운영 배포 후 해당 E2E 스크립트나 브라우저로 확인해요. 확인하지 못한 것은 "미실행"으로 적어요.
- 실패를 고칠 때는 수정 전 재현 → 최소 수정 → 같은 입력으로 재검증 순서를 지키고, 기준 SHA와 결과를 기록해요.
- 보고와 UI 문구는 한국어 해요체로 써요.

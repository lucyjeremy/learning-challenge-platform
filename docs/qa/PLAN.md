# QA 계획

| 항목 | 내용 |
|---|---|
| 작성일 | 2026-11-27 (KST) |
| 대상 | 챌린지업 학생 흐름 (현재 운영 배포 범위) |
| 기준 코드 | `main` `f85c7de` |
| 완료 기준 | [SPEC.md](SPEC.md) AC-01~03, 확인 방법은 [DONE_CRITERIA.md](DONE_CRITERIA.md) |

## 1. 범위

| 구분 | 내용 |
|---|---|
| 포함 | 가입·로그인·로그아웃, 탐색·소개·무료 신청(정원·동시성), 내 강의실·Day 열람, 미션 인증(텍스트·링크·체크), 피드 글쓰기·수정·삭제·좋아요, 리더보드, 그로블 결제 웹훅 수신, 저장 실패 처리(AC-01), 오류 화면 |
| 제외 (기능 없음) | 강사 신청·챌린지 등록·검수, 정기 작업(상태 전환·완주 판정), 강사 대시보드, 마이페이지, 신고, 사진 인증, 인증 수정·삭제, 댓글 화면, 비밀번호 재설정, 구글 로그인 |
| 제외 (환경 없음) | 동시 200명 부하, 1만 명 시드, 백업 복원 — 스테이징·요금제 결정 전 |

## 2. 환경

| 항목 | 내용 |
|---|---|
| 운영 | https://learning-challenge-platform-virid.vercel.app , Vercel 함수 리전 icn1(`web/vercel.json`), Supabase challengeup(ap-northeast-2) |
| 로컬 | `npm install --prefix web` → `npm run build --prefix web` → `npm --prefix web run start -- -p 3123` (Supabase 키가 없으면 메모리 저장소·데모 세션) |
| 도구 | Vitest 3 (`npm test --prefix web`), Playwright 1.65 (Chromium·WebKit 에뮬. Firefox는 이 PC에서 실행 실패), @axe-core/playwright, Supabase REST 직접 호출 |
| 데이터 | 운영 DB의 QA 계정(qa-sub-a~d@demo.test 등). 스테이징 DB 없음 |
| 제약 | 운영 서버 시각을 고정할 수 없어 시간 경계는 단위 테스트로만 확인 |

## 3. 순서

1. 단위 테스트: `npm test --prefix web` → 65개 통과 확인 (2026-11-27 19:31, `f85c7de` 작업 트리에서 65/65 통과. 작업 트리에 `web/package.json`·`web/.gitignore` 미커밋 변경 있음, 코드 변경 아님)
2. 정적 검사: `npx tsc --noEmit`, `npm run lint --prefix web` → 오류 0 (2026-11-27 `f85c7de` 작업 트리에서 tsc 오류 0, eslint 출력 없음)
3. 운영 스모크: 탐색 → 소개 → 가입 → 신청 → 내 강의실 → Day 인증 → 피드 (`student-qa.mjs`, BASE=운영)
4. AC-01: `node ac01.mjs <출력폴더>`, `LOSE=1 node feed02.mjs` (운영). 이어서 인증·로그인·가입 폼의 같은 실패 재현
5. AC-02: TC-FN-ENR-001 동시 신청, TC-FN-DISC-004 정원 마감 표시
6. AC-03: Vitest 마감 경계(`store.test.ts`, `domain.test.ts`), 운영 화면에서 마감 지난 Day 인증 폼 없음 확인
7. 회귀: [전체 테스트 실행 결과](../../waterfall/05-테스트/전체-테스트-실행-결과.md) 5.1 회귀 목록

## 4. 종료 기준

| 기준 | 현재 |
|---|---|
| S0(출시 차단)·S1 미해결 결함 0건 | 충족 — 기록된 S0 1건·S1 결함은 모두 해결·재검증 |
| AC-01~03 판정 기록 | AC-01 피드 통과(다른 폼 미실행), AC-02 부분 통과, AC-03 부분 통과 |
| 포함 범위 TC 실패 0건 | 충족 — 166개 중 실패 0 (2026-11-26 기준) |
| 미실행 TC마다 사유 기록 | 충족 — 80건 모두 사유 있음 |
| 승인자 서명 | 미충족 — 승인자 미정 (DEC-001) |

결함 등급: S0 출시 차단, S1 주요 기능 불가(우회 없음), S2 일부 기능 불편, S3 사소. 기존 기록의 Critical·High·Medium·Low는 그대로 두고 S0·S1·S2·S3에 대응시킨다.

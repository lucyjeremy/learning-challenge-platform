# 운영 E2E 점검 스크립트 (Playwright)

운영 사이트(https://learning-challenge-platform-virid.vercel.app)를 대상으로 같은 입력을 다시 실행해 결과를 비교하는 스크립트예요. 결과 JSON은 콘솔에, 스크린샷은 `e2e-out/`(커밋 제외)에 남아요.

## 준비

```powershell
npm install --prefix web
npx --prefix web playwright install chromium
$env:E2E_PASSWORD = "<QA 계정 비밀번호>"   # 로그인이 필요한 스크립트만. 값은 팀 비밀 저장소에서 받아요
```

## 스크립트

| 파일 | 확인하는 것 | 완료 기준 | 통과 결과 |
|---|---|---|---|
| `ac01-request-fail.mjs` | 글쓰기 저장 요청이 끊김 → 입력 유지·안내·재시도 | AC-01 | `titleKept·bodyKept·buttonEnabled: true`, `created: 1` |
| `feed02-response-lost.mjs` (`$env:LOSE=1`) | 서버엔 저장되고 응답만 끊김 → 재시도해도 1건 | FEED-02 | `created: 1` |
| `ac01-forms.mjs` | 가입·로그인·인증 제출의 같은 실패 | AC-01 | 세 폼 모두 `kept·enabled·retryOk: true` |
| `keyboard-tab.mjs` | 주요 4화면 Tab·Shift+Tab 순서, 못 닿는 요소 | 접근성 | 못 닿은 요소 0개, 역순 일치 true |
| `ux-light-confirm.mjs` | 라이트 모드 대비(axe), 비밀번호 보기, 자체 확인창 | 토스 UX | 대비 위반 0, 기본 확인창 0회 |

실행 예: `node web/e2e/ac01-request-fail.mjs`

## 주의

- 운영 DB에 QA 데이터(글·인증·가입 계정 `qa-ac01-…@demo.test`)가 남아요. 글은 스크립트가 지우지만 인증과 가입 계정은 남아요.
- `ac01-forms.mjs`의 인증 제출은 계정마다 오늘 Day를 한 번만 할 수 있어요. 다시 돌릴 때는 두 번째 인자로 다른 QA 계정을 넘겨요.
- 실행 기록과 판정은 `waterfall/08-검토/4일차-하네스-실습-기록.md`에 있어요.

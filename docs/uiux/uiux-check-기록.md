# /uiux-check 실행 기록 (2일차 실습 2)

| 항목 | 내용 |
|---|---|
| 실행일 | 2026-11-27 |
| Skill | `.claude/skills/uiux-check/SKILL.md` (R1 위계 · R2 상태 · R3 반응형·접근성 · R4 범위) |
| 입력 | A `docs/uiux/fixtures/approved.md`, B `docs/uiux/fixtures/needs-review.md` |
| 근거 문서 | SRS(FR-013~015, FR-024), 화면설계서(SCR-DAY-01, 2.3), PLAN.md |
| 실행 방식 | 각 입력을 **새 세션(서브에이전트) 하나씩**에서 SKILL.md 절차대로 판정. Skill이 `disable-model-invocation: true`라 `/uiux-check` 슬래시 호출은 사용자가 직접 해야 함 → 슬래시 호출 결과는 **미확인** |

## 1. 예상 판정 (실행 전 작성)

| 규칙 | A | B |
|---|---|---|
| R1 | PASS | REVIEW (인증하기가 펼침 안, 파란 버튼 2개) |
| R2 | PASS | REVIEW (미션 없음·오류 합침, 실패 시 입력 초기화) |
| R3 설계 / 실행 | PASS / UNVERIFIED | REVIEW (1200px 고정, 포커스 설명 없음) / UNVERIFIED |
| R4 | PASS | REVIEW (사진 업로드·결제 포함) |
| 전체 | PASS | REVIEW |

## 2. 1차 실행 결과

| 규칙 | A | B |
|---|---|---|
| R1 | PASS | REVIEW |
| R2 | PASS | REVIEW |
| R3 설계 / 실행 | PASS / UNVERIFIED | REVIEW / UNVERIFIED |
| R4 | PASS — 다만 "결제는 화면에 없고 PLAN.md에도 언급이 없어 위반으로 보지 않음. 시안이 결제를 후속 단계로 표시하지도 않음"이라고 판정자가 따로 해석함 | REVIEW (PLAN.md 5단계, 화면설계서 "사진 형식 입력 칸은 없음" 인용) |
| 전체 | PASS (UNVERIFIED 1) | REVIEW (REVIEW 4, UNVERIFIED 1) |

예상과 실제 판정은 모두 일치했어요. 그러나 A의 R4는 규칙 문장("결제는 후속 단계로 표시돼 있다")과 시안("결제 없음")이 맞지 않아 판정자가 해석해야 했어요. → **모호한 규칙**

## 3. 고친 규칙 한 줄

- 전: `사진 업로드, 강사 확인, 결제는 후속 단계로 표시돼 있다`
- 후: `범위 밖 기능(사진 업로드·강사 확인은 PLAN.md 5단계 미구현, 결제는 SRS FR-024 P4 제외)은 화면에 없거나 '후속 단계'로만 표시되면 PASS. 근거로 해당 문서 위치를 인용한다`

## 4. 재실행 (A, 같은 입력)

| 규칙 | 1차 | 재실행 |
|---|---|---|
| R4 | PASS, 결제 판단은 판정자 해석 | PASS, 근거 `PLAN.md` L14와 `SRS` L240 FR-024 "P4 제외"를 인용함 (해석 없이 규칙대로 판정) |
| 나머지 | R1·R2·R3 설계 PASS, R3 실행 UNVERIFIED | 같음 |

재실행에서 새로 나온 참고 사항:
- 마감 지남 상태를 시안은 "폼 숨김"으로, 화면설계서 SCR-DAY-01은 "버튼 비활성 + 쓴 내용은 이 기기에 남아 있어요"로 적었어요. R2 위반은 아니지만 명세와 맞출지 결정이 필요해요.
- Tab 순서 맨 앞의 "제목"은 포커스를 받는 요소가 아니어서, Tab 순서 설명을 고쳐야 해요.

## 5. 남은 확인

- `/uiux-check` 슬래시 메뉴 노출과 직접 호출은 사용자가 확인해야 해요(미확인).
- R3 실행: 실제 구현 화면의 360px·키보드 결과는 `web/e2e/keyboard-tab.mjs`(주요 4화면, 못 닿은 요소 0)와 전체 테스트 TC-CP-RES-001에 있어요. 다만 시안 문서에는 연결돼 있지 않아요.

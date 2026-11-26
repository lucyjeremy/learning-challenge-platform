-- 0003_groble_webhook.sql: 그로블 결제 웹훅 연결
-- 실행: 2026-11-26, 프로젝트 challengeup (ap-northeast-2)

-- 그로블 상품 ↔ 챌린지 연결 (상품 관리의 콘텐츠 id)
alter table challenges add column groble_content_id text unique;

-- 받은 웹훅 기록. 같은 이벤트는 한 번만 처리한다(멱등).
create table webhook_events (
  id text primary key,                 -- 그로블 이벤트 id (x-groble-idempotency-key)
  source text not null default 'groble',
  type text not null,                  -- payment.completed 등
  result text not null,                -- enrolled / already_enrolled / unmapped_product / unknown_buyer / recorded / failed:...
  payload jsonb not null,
  received_at timestamptz not null default now()
);

alter table webhook_events enable row level security;
grant all on webhook_events to service_role;

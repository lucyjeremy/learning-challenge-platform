-- 0002_app_adjust.sql: 웹 앱 연결에 필요한 열 추가와 보안 설정
-- 실행: 2026-11-26, 프로젝트 challengeup (ap-northeast-2)

-- 챌린지: 주소용 slug, 기수(숫자만), 화면용 값
alter table challenges add column slug text unique;
alter table challenges add column cohort_no int not null default 1 check (cohort_no >= 1);
alter table challenges add column tone text;
alter table challenges add column seed_enrolled int not null default 0 check (seed_enrolled >= 0);

-- 신청: 시드 인원에 이미 포함된 신청 표시
alter table enrollments add column seeded boolean not null default false;

-- 글: 제목
alter table posts add column title text check (title is null or char_length(title) between 1 and 60);

-- 모든 테이블 RLS 활성화. 정책이 없으므로 브라우저(anon 키)로는 접근할 수 없고,
-- 서버의 service_role 키로만 읽고 쓴다 (BP-CONTENT-001-3).
alter table profiles enable row level security;
alter table instructor_applications enable row level security;
alter table challenges enable row level security;
alter table missions enable row level security;
alter table enrollments enable row level security;
alter table submissions enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;
alter table reports enable row level security;
alter table point_logs enable row level security;
alter table notices enable row level security;
alter table admin_logs enable row level security;

-- 새 테이블 자동 API 권한을 끈 프로젝트라서, 서버 키(service_role)에만 권한을 준다.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

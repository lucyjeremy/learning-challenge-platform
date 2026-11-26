-- 0001_init.sql: 챌린지업 초기 스키마 초안
-- 근거: 상세설계서 DDS-CHUP-v0.2 2.1 (테이블·열거형·제약). RLS·RPC·pg_cron은 후속 마이그레이션(2~7단계)에서 추가.
-- 실행 상태: 미실행 (Supabase 미연결).

create extension if not exists pgcrypto;

-- 열거형
create type user_role as enum ('student', 'instructor', 'admin');
create type application_status as enum ('pending', 'approved', 'rejected');
create type category as enum ('dev', 'design', 'language', 'self_dev', 'fitness', 'finance');
create type challenge_status as enum ('draft', 'in_review', 'recruiting', 'in_progress', 'ended', 'cancelled');
create type unlock_mode as enum ('daily', 'all_at_start');
create type approval_mode as enum ('auto', 'manual');
create type proof_type as enum ('text', 'photo', 'link', 'check');
create type enrollment_status as enum ('active', 'cancelled', 'challenge_cancelled', 'completed', 'incomplete');
create type submission_status as enum ('pending', 'approved', 'rejected');
create type visibility as enum ('public', 'private');
create type post_type as enum ('proof', 'question', 'free', 'notice');
create type point_reason as enum ('proof_approved', 'early_bonus', 'like_received', 'comment_written', 'streak_bonus', 'revoke');
create type report_reason as enum ('abuse', 'spam', 'obscene', 'privacy', 'other');
create type report_status as enum ('open', 'hidden', 'kept');
create type report_target as enum ('post', 'comment');
create type notice_type as enum ('instructor_result', 'challenge_rejected', 'challenge_cancelled', 'completion_result', 'review_auto_returned');

-- 사용자 프로필 (auth.users와 1:1)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 20),
  avatar_url text,
  bio text check (char_length(bio) <= 60),
  role user_role not null default 'student',
  terms_agreed_at timestamptz,
  created_at timestamptz not null default now()
);

create table instructor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 20 and 500),
  intro_url text,
  status application_status not null default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);
create unique index one_pending_application on instructor_applications(user_id) where status = 'pending';

create table challenges (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles(id),
  title text not null check (char_length(title) between 5 and 50),
  summary text not null check (char_length(summary) between 10 and 80),
  description text not null check (char_length(description) between 50 and 5000),
  category category not null,
  thumbnail_path text,
  start_date date not null,
  duration_days int not null check (duration_days between 7 and 60),
  end_date date generated always as (start_date + (duration_days - 1)) stored,
  unlock_mode unlock_mode not null default 'daily',
  capacity int not null check (capacity between 1 and 300),
  completion_rate int not null default 80 check (completion_rate between 50 and 100 and completion_rate % 10 = 0),
  approval_mode approval_mode not null default 'auto',
  price int not null default 0 check (price = 0),
  status challenge_status not null default 'draft',
  review_requested_at timestamptz,
  published_at timestamptz,
  reject_reason_type text,
  reject_reason text,
  cancel_reason text,
  judged_at timestamptz,
  completion_ratio numeric,
  created_at timestamptz not null default now()
);
create index challenges_status_start on challenges(status, start_date);

create table missions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  day_no int not null check (day_no >= 1),
  title text not null check (char_length(title) between 2 and 40),
  description text not null check (char_length(description) between 10 and 2000),
  proof_type proof_type not null,
  video_url text,
  resource_urls text[] not null default '{}' check (cardinality(resource_urls) <= 3),
  unique (challenge_id, day_no)
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status enrollment_status not null default 'active',
  current_streak int not null default 0,
  longest_streak int not null default 0,
  approved_count int not null default 0,
  enrolled_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index one_active_enrollment on enrollments(challenge_id, user_id) where status = 'active';

create table submissions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  mission_id uuid not null references missions(id) on delete cascade,
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  day_no int not null,
  body text,
  link_url text,
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 3),
  visibility visibility not null default 'public',
  status submission_status not null default 'approved',
  first_submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references profiles(id),
  review_feedback text,
  unique (enrollment_id, mission_id)
);
create index submissions_challenge_status on submissions(challenge_id, status);

create table posts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  type post_type not null,
  body text check (char_length(body) between 1 and 2000),
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 3),
  submission_id uuid references submissions(id) on delete cascade,
  pinned_at timestamptz,
  hidden_at timestamptz,
  temp_hidden_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index posts_one_per_submission on posts(submission_id) where submission_id is not null;

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  hidden_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create table likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  target_type report_target not null,
  target_id uuid not null,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason report_reason not null,
  detail text,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

-- 포인트 원장: 추가 전용. 합계는 저장하지 않고 조회 시 계산한다.
create table point_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  reason point_reason not null,
  points int not null,
  source_key text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index point_logs_source on point_logs(source_key);
create index point_logs_challenge_time on point_logs(challenge_id, created_at);
create index point_logs_user on point_logs(user_id);

create table notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notice_type not null,
  payload jsonb not null default '{}',
  seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

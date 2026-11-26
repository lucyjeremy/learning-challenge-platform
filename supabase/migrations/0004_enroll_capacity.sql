-- 0004_enroll_capacity.sql: 마지막 자리 동시 신청 시 정원 초과 방지 (TC-FN-ENR-001)
-- 실행: 2026-11-26, 프로젝트 challengeup
-- 앱은 "불러오기 → 규칙 확인 → 저장" 순서라 동시 요청이 둘 다 통과할 수 있다.
-- 신청 행을 넣기 직전에 챌린지 행을 잠그고 인원을 다시 세서, 정원이 찼으면 거절한다.

create or replace function check_enroll_capacity() returns trigger
language plpgsql as $$
declare
  cap int;
  seeded int;
  added int;
begin
  if new.status <> 'active' then
    return new;
  end if;
  select capacity, seed_enrolled into cap, seeded from challenges where id = new.challenge_id for update;
  select count(*) into added from enrollments
    where challenge_id = new.challenge_id and status = 'active' and not seeded;
  if seeded + added >= cap then
    raise exception 'CAPACITY_FULL';
  end if;
  return new;
end;
$$;

create trigger enroll_capacity before insert on enrollments
  for each row execute function check_enroll_capacity();

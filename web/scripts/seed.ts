// Supabase 시드: 데모 계정·챌린지·Day·데모 학생의 지난 기록을 넣는다. 여러 번 실행해도 같은 결과가 되도록 만든다.
// 실행: npx tsx scripts/seed.ts  (web 폴더, .env.local 필요)
// 형식 정리(마이그레이션): 코드의 카테고리·인증 형식·승인 방식을 DB 열거형 값으로 바꾸고, 기수는 숫자(cohort_no)로 넣는다.

import { createClient } from "@supabase/supabase-js";
import { challenges, missionDetail } from "../src/lib/data";
import { dayDate } from "../src/domain/day-calendar";

process.loadEnvFile(".env.local");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const DEMO_PASSWORD = "demo1234"; // 로컬·데모용 테스트 비밀번호 (store.ts DEMO_PASSWORD와 같음)
const TODAY = "2026-11-25"; // lib/data.ts TODAY

const CATEGORY = { 개발: "dev", 디자인: "design", 외국어: "language", 자기계발: "self_dev", 운동: "fitness", 재테크: "finance" } as const;
const PROOF = { 텍스트: "text", 사진: "photo", 링크: "link", 체크: "check" } as const;

function must<R extends { data: unknown; error: { message: string } | null }>(r: R, what: string): NonNullable<R["data"]> {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as NonNullable<R["data"]>;
}

async function ensureUser(email: string, name: string, role: "student" | "instructor" | "admin", bio?: string) {
  const list = must(await db.auth.admin.listUsers({ perPage: 1000 }), "사용자 목록");
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    user = must(await db.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true }), `계정 ${email}`).user!;
  }
  must(
    await db.from("profiles").upsert({ id: user.id, name, role, bio: bio?.slice(0, 60) ?? null, terms_agreed_at: new Date().toISOString() }),
    `프로필 ${email}`,
  );
  return user.id;
}

function statusOf(start: string, days: number) {
  const end = dayDate(start, days);
  if (TODAY < start) return "recruiting";
  if (TODAY <= end) return "in_progress";
  return "ended";
}

async function main() {
  const studentId = await ensureUser("student@demo.test", "김지은", "student");
  await ensureUser("admin@demo.test", "운영팀", "admin");

  const challengeIds: Record<string, string> = {};
  for (const c of challenges) {
    const email = c.instructor.name === "박민호" ? "instructor@demo.test" : `instructor-${c.id}@demo.test`;
    const instructorId = await ensureUser(email, c.instructor.name, "instructor", c.instructor.bio);
    const row = must(
      await db
        .from("challenges")
        .upsert(
          {
            slug: c.id,
            instructor_id: instructorId,
            title: c.title,
            summary: c.summary,
            // 형식 정리: 소개가 50자 미만이면 요약을 이어 붙인다 (DB 제약 50~5000자)
            description: c.intro.length >= 50 ? c.intro : `${c.intro}

${c.summary}`,
            category: CATEGORY[c.category],
            start_date: c.startDate,
            duration_days: c.days,
            capacity: c.capacity,
            completion_rate: c.completionRate,
            approval_mode: c.approval === "자동 인정" ? "auto" : "manual",
            price: 0,
            status: statusOf(c.startDate, c.days),
            cohort_no: 1,
            tone: c.tone,
            seed_enrolled: c.enrolled,
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single(),
      `챌린지 ${c.id}`,
    );
    challengeIds[c.id] = row.id;
    // 형식 정리: Day 제목이 기간보다 적으면 남은 Day를 "Day N 미션"으로 채운다
    const titles = Array.from({ length: c.days }, (_, i) => c.dayTitles[i] ?? `Day ${i + 1} 미션`);
    const missions = titles.map((title, i) => ({
      challenge_id: row.id,
      day_no: i + 1,
      title,
      description:
        (c.id === "python-21" ? missionDetail[i + 1]?.mission : undefined) ??
        `${title} 강의를 보고, 배운 내용을 직접 해 본 결과를 인증해 주세요.`,
      proof_type: PROOF[c.format],
    }));
    must(await db.from("missions").upsert(missions, { onConflict: "challenge_id,day_no" }), `Day ${c.id}`);
  }

  // 데모 학생: python-21 참여 중, Day 1·2·4·5·6 인증 (Day 3 놓침)
  const py = challengeIds["python-21"];
  let enr = must(
    await db.from("enrollments").select("id").eq("challenge_id", py).eq("user_id", studentId).eq("status", "active").maybeSingle(),
    "신청 조회",
  );
  if (!enr) {
    enr = must(
      await db.from("enrollments").insert({ challenge_id: py, user_id: studentId, seeded: true }).select("id").single(),
      "신청 넣기",
    );
  }
  const missions = must(await db.from("missions").select("id, day_no").eq("challenge_id", py), "Day 조회");
  for (const d of [1, 2, 4, 5, 6]) {
    const mission = missions.find((m) => m.day_no === d)!;
    const existing = must(
      await db.from("submissions").select("id").eq("enrollment_id", enr.id).eq("mission_id", mission.id).maybeSingle(),
      "인증 조회",
    );
    if (existing) continue;
    const sub = must(
      await db
        .from("submissions")
        .insert({
          enrollment_id: enr.id,
          mission_id: mission.id,
          challenge_id: py,
          user_id: studentId,
          day_no: d,
          body: "지난 Day 인증 (예시)",
          visibility: "private",
          status: "approved",
          first_submitted_at: new Date(`${dayDate("2026-11-19", d)}T12:00:00+09:00`).toISOString(),
        })
        .select("id")
        .single(),
      "인증 넣기",
    );
    must(
      await db.from("point_logs").insert([
        { user_id: studentId, challenge_id: py, reason: "proof_approved", points: 10, source_key: `proof:${sub.id}`, idempotency_key: `proof:${sub.id}:0` },
        { user_id: studentId, challenge_id: py, reason: "early_bonus", points: 5, source_key: `early:${sub.id}`, idempotency_key: `early:${sub.id}:0` },
      ]),
      "포인트 넣기",
    );
  }

  const count = async (t: string) => (await db.from(t).select("*", { count: "exact", head: true })).count;
  console.log({
    profiles: await count("profiles"),
    challenges: await count("challenges"),
    missions: await count("missions"),
    enrollments: await count("enrollments"),
    submissions: await count("submissions"),
    point_logs: await count("point_logs"),
  });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

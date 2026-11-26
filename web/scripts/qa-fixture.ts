// QA 준비: 이미 시작된 기수(python-21)에 QA 전용 계정을 참여시킨다. 시작 후에는 화면에서 신청할 수 없어서 DB로 넣는다.
// 실행: npx tsx scripts/qa-fixture.ts  (web 폴더, .env.local 필요). 여러 번 실행해도 같은 결과.

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const QA_PASSWORD = "qatest123"; // QA 전용 테스트 비밀번호
const ACCOUNTS = [
  { email: "qa-sub-a@demo.test", name: "QA공개인증" },
  { email: "qa-sub-b@demo.test", name: "QA중복제출" },
  { email: "qa-sub-c@demo.test", name: "QA비공개" },
  { email: "qa-sub-d@demo.test", name: "QA마감오프라인" },
];

async function main() {
  const { data: c, error } = await db.from("challenges").select("id").eq("slug", "python-21").single();
  if (error) throw error;
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const a of ACCOUNTS) {
    let user = list?.users.find((u) => u.email === a.email);
    if (!user) {
      const r = await db.auth.admin.createUser({ email: a.email, password: QA_PASSWORD, email_confirm: true });
      if (r.error) throw r.error;
      user = r.data.user!;
    }
    await db.from("profiles").upsert({ id: user.id, name: a.name, role: "student", terms_agreed_at: new Date().toISOString() });
    const { data: e } = await db.from("enrollments").select("id").eq("challenge_id", c.id).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!e) {
      const r = await db.from("enrollments").insert({ challenge_id: c.id, user_id: user.id });
      if (r.error) throw r.error;
    }
    console.log(`${a.email} 준비됨`);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});

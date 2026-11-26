// 시드 데이터. Supabase를 연결하면 이 파일의 조회 함수만 DB 쿼리로 바꾸면 돼요.

export type Category = "개발" | "디자인" | "외국어" | "자기계발" | "운동" | "재테크";
export const CATEGORIES: Category[] = ["개발", "디자인", "외국어", "자기계발", "운동", "재테크"];

export type CheckinFormat = "텍스트" | "사진" | "링크" | "체크";

export type Challenge = {
  id: string;
  title: string;
  summary: string;
  category: Category;
  instructor: { name: string; bio: string };
  startDate: string; // YYYY-MM-DD (KST)
  days: number;
  capacity: number;
  enrolled: number;
  price: number;
  completionRate: number; // 완주 조건 %
  approval: "자동 인정" | "강사 확인 후 인정";
  format: CheckinFormat;
  intro: string;
  dayTitles: string[];
  tone: string; // 썸네일 바탕색 (이미지가 생기기 전까지 쓰는 색면)
};

// 시드 데이터의 기준 날짜예요. DB를 연결하면 서버의 KST 오늘 날짜로 바꿔요.
export const TODAY = "2026-11-25";

export const ME = { name: "김지은", initial: "지", level: 3, points: 96 };

export const challenges: Challenge[] = [
  {
    id: "python-21",
    title: "21일 파이썬 기초",
    summary: "설치부터 작은 가계부 프로그램까지, 하루 20분씩 끝까지 가 봐요.",
    category: "개발",
    instructor: { name: "박민호", bio: "현업 백엔드 개발자 · 코딩 챌린지 4기 운영" },
    startDate: "2026-11-19",
    days: 21,
    capacity: 30,
    enrolled: 28,
    price: 0,
    completionRate: 80,
    approval: "자동 인정",
    format: "텍스트",
    intro: `인강을 사 놓고 3강에서 멈춘 적 있나요? 이 챌린지는 그 3강을 넘기기 위해 만들었어요.

매일 20분 안팎의 강의 하나와, 바로 손으로 해 보는 미션 하나가 열려요. 미션은 직접 짠 코드와 실행 결과를 붙여 넣으면 끝이에요. 정답보다 "오늘도 한 줄 써 봤다"가 더 중요해요.

✔ 이런 분께 맞아요
- 프로그래밍을 처음 배우는 분
- 혼자 듣다가 몇 번 멈춰 본 분
- 하루 20~30분을 꾸준히 낼 수 있는 분

✔ 끝나면 할 수 있는 것
- 변수, 조건문, 반복문, 함수로 작은 프로그램 짜기
- 파일을 읽고 써서 데이터를 저장하기
- 마지막 날 나만의 가계부 프로그램 완성하기

막히면 피드에 질문 글을 남겨 주세요. 저녁 9시 전에는 꼭 답을 달아 드려요.`,
    dayTitles: [
      "파이썬 설치하고 첫 줄 출력하기",
      "변수와 자료형",
      "문자열 다루기",
      "입력 받아서 계산하기",
      "조건문 if",
      "반복문 for",
      "반복문 while과 break",
      "리스트 기초",
      "리스트 메서드 써 보기",
      "튜플과 집합",
      "딕셔너리",
      "함수 만들기",
      "매개변수와 반환값",
      "중간 프로젝트: 숫자 맞히기 게임",
      "파일 읽고 쓰기",
      "예외 처리",
      "모듈과 import",
      "표준 라이브러리 둘러보기",
      "클래스 맛보기",
      "최종 프로젝트: 가계부 프로그램",
      "회고하고 다음 걸음 정하기",
    ],
    tone: "#1d2b3a",
  },
  {
    id: "figma-14",
    title: "14일 피그마로 앱 화면 만들기",
    summary: "오토 레이아웃과 컴포넌트로 실제 앱 화면 5장을 완성해요.",
    category: "디자인",
    instructor: { name: "정하린", bio: "프로덕트 디자이너 · 7년 차" },
    startDate: "2026-11-28",
    days: 14,
    capacity: 40,
    enrolled: 31,
    price: 0,
    completionRate: 80,
    approval: "자동 인정",
    format: "사진",
    intro: `피그마를 켜 놓고 뭘 해야 할지 몰랐다면 이번 2주가 딱 좋아요. 하루에 화면 하나씩, 실무에서 바로 쓰는 방법으로 만들어 봐요.

✔ 매일 하는 일
- 10~15분 강의 보기
- 오늘 배운 기능으로 화면 일부 만들기
- 캡처해서 인증하기

✔ 끝나면 남는 것
- 로그인, 목록, 상세, 설정, 결제 화면 5장
- 다시 쓸 수 있는 버튼·입력창 컴포넌트`,
    dayTitles: [
      "프레임과 그리드 잡기",
      "텍스트 스타일 정하기",
      "색 스타일 만들기",
      "오토 레이아웃 기초",
      "버튼 컴포넌트 만들기",
      "변형(Variant)으로 상태 나누기",
      "입력창과 폼 만들기",
      "로그인 화면 완성",
      "목록 화면 만들기",
      "상세 화면 만들기",
      "설정 화면 만들기",
      "결제 화면 만들기",
      "프로토타입 연결하기",
      "포트폴리오용으로 정리하기",
    ],
    tone: "#3a2733",
  },
  {
    id: "english-30",
    title: "30일 영어 쉐도잉",
    summary: "미드 한 장면을 매일 따라 말하고 녹음해서 올려요.",
    category: "외국어",
    instructor: { name: "에밀리 윤", bio: "통번역사 · 쉐도잉 스터디 5년 운영" },
    startDate: "2026-12-01",
    days: 30,
    capacity: 50,
    enrolled: 38,
    price: 0,
    completionRate: 70,
    approval: "자동 인정",
    format: "링크",
    intro: `듣기는 되는데 말이 안 나온다면, 입이 아직 영어 리듬을 모르는 거예요. 하루 15분, 짧은 장면 하나를 따라 말해 봐요.

✔ 하루 순서
- 장면 듣기 → 대본 보며 따라 하기 → 대본 없이 녹음하기
- 녹음 파일 링크로 인증하기

완주 조건은 30일 중 21일이에요. 바쁜 날이 있어도 괜찮아요.`,
    dayTitles: [
      "카페에서 주문하기",
      "길 묻고 답하기",
      "첫 출근 날 인사",
      "약속 잡기",
      "전화로 예약하기",
      "불만 말하기",
      "칭찬하고 받기",
    ],
    tone: "#2b3326",
  },
  {
    id: "morning-21",
    title: "21일 미라클 모닝 루틴",
    summary: "아침 6시 30분, 물 한 잔과 10분 스트레칭부터 시작해요.",
    category: "자기계발",
    instructor: { name: "오세진", bio: "『아침 30분』 저자" },
    startDate: "2026-12-01",
    days: 21,
    capacity: 100,
    enrolled: 100,
    price: 0,
    completionRate: 80,
    approval: "자동 인정",
    format: "사진",
    intro: `일찍 일어나는 것보다 일어나서 할 일이 정해져 있는 게 더 중요해요. 21일 동안 아침 30분 루틴을 하나씩 쌓아요.`,
    dayTitles: [
      "기상 시간 정하기",
      "물 한 잔과 창문 열기",
      "10분 스트레칭",
      "오늘 할 일 세 줄 쓰기",
      "휴대폰 없이 20분",
      "아침 산책",
      "첫 주 돌아보기",
    ],
    tone: "#3d3424",
  },
  {
    id: "run-28",
    title: "28일 5km 달리기",
    summary: "걷기와 달리기를 섞어 4주 뒤 쉬지 않고 5km를 달려요.",
    category: "운동",
    instructor: { name: "한도윤", bio: "생활체육 지도자 · 러닝 크루 리더" },
    startDate: "2026-11-11",
    days: 28,
    capacity: 60,
    enrolled: 44,
    price: 0,
    completionRate: 70,
    approval: "자동 인정",
    format: "사진",
    intro: `처음부터 5km를 달리지 않아요. 1분 달리고 2분 걷는 것부터 시작해요. 러닝 앱 기록을 캡처해서 인증하면 돼요.`,
    dayTitles: [
      "1분 달리기 + 2분 걷기 × 6",
      "쉬는 날: 스트레칭",
      "1분 30초 달리기 + 2분 걷기 × 6",
      "쉬는 날: 폼롤러",
      "2분 달리기 + 2분 걷기 × 5",
      "가볍게 30분 걷기",
      "첫 주 기록 비교하기",
    ],
    tone: "#24323a",
  },
  {
    id: "money-21",
    title: "21일 가계부 쓰기",
    summary: "하루 5분, 쓴 돈을 적는 습관부터 한 달 예산 짜기까지.",
    category: "재테크",
    instructor: { name: "최유나", bio: "재무 상담사 · 사회초년생 재테크 강의" },
    startDate: "2026-12-08",
    days: 21,
    capacity: 60,
    enrolled: 12,
    price: 0,
    completionRate: 80,
    approval: "자동 인정",
    format: "체크",
    intro: `돈 관리는 얼마를 쓰는지 아는 데서 시작해요. 앱이든 노트든 상관없어요. 매일 적고 "완료했어요"만 누르면 돼요.`,
    dayTitles: [
      "가계부 도구 고르기",
      "오늘 쓴 돈 적기",
      "고정 지출 정리하기",
      "구독 서비스 점검하기",
      "카테고리 나누기",
      "일주일 지출 돌아보기",
      "다음 주 예산 정하기",
    ],
    tone: "#2f2a3a",
  },
  {
    id: "sql-14",
    title: "14일 SQL 첫걸음",
    summary: "SELECT부터 JOIN까지, 매일 문제 3개씩 직접 풀어요.",
    category: "개발",
    instructor: { name: "박민호", bio: "현업 백엔드 개발자 · 코딩 챌린지 4기 운영" },
    startDate: "2026-12-03",
    days: 14,
    capacity: 30,
    enrolled: 9,
    price: 0,
    completionRate: 80,
    approval: "강사 확인 후 인정",
    format: "텍스트",
    intro: `엑셀 필터로 하던 일을 SQL 한 줄로 끝내 봐요. 브라우저에서 바로 실행되는 연습장을 써서 설치할 것도 없어요.`,
    dayTitles: [
      "SELECT와 FROM",
      "WHERE로 걸러내기",
      "ORDER BY와 LIMIT",
      "집계 함수",
      "GROUP BY",
      "HAVING",
      "첫 주 복습 문제",
    ],
    tone: "#1f2f2d",
  },
  {
    id: "drawing-30",
    title: "30일 드로잉 습관",
    summary: "매일 15분, 주변 사물을 하나씩 그려요. 잘 그릴 필요 없어요.",
    category: "디자인",
    instructor: { name: "이서아", bio: "일러스트레이터 · 그림책 작가" },
    startDate: "2026-11-16",
    days: 30,
    capacity: 50,
    enrolled: 47,
    price: 0,
    completionRate: 70,
    approval: "자동 인정",
    format: "사진",
    intro: `연필 한 자루와 아무 종이면 충분해요. 컵, 신발, 창밖 풍경까지 매일 하나씩 그려요.`,
    dayTitles: [
      "선 긋기 연습",
      "컵 그리기",
      "그림자 넣기",
      "신발 그리기",
      "손 그리기",
      "창밖 풍경",
      "첫 주 그림 다시 그리기",
    ],
    tone: "#382b26",
  },
];

export function getChallenge(id: string) {
  return challenges.find((c) => c.id === id);
}

// 로그인한 사용자의 신청 정보 (시드)
export type DayStatus = "인정" | "강사 확인 중" | "반려" | "놓침";
export const myEnrollments: Record<string, { statuses: Record<number, DayStatus> }> = {
  "python-21": { statuses: { 1: "인정", 2: "인정", 3: "놓침", 4: "인정", 5: "인정", 6: "인정" } },
};

export function isMember(id: string) {
  return id in myEnrollments;
}

// 피드 (python-21)
export type Post = {
  id: string;
  kind: "공지" | "인증" | "질문" | "자유";
  author: string;
  role?: "강사";
  day?: number;
  time: string;
  body: string;
  code?: string;
  likes: number;
  comments: number;
  pinned?: boolean;
  firstComment?: { author: string; body: string };
  likedByMe?: boolean;
  title?: string;
  edited?: boolean;
  mine?: boolean;
};

export const posts: Post[] = [
  {
    id: "p1",
    kind: "공지",
    author: "박민호",
    role: "강사",
    time: "11.18(수)",
    pinned: true,
    body: `OT 안내예요. 매일 0시에 그날 강의와 미션이 열리고, 밤 11시 59분에 마감돼요. 저녁 9시 전에 인증하면 5점을 더 드려요.

막히는 부분은 '질문'으로 올려 주세요. 다른 분 질문에 답을 달아 주시는 것도 큰 도움이 돼요.`,
    likes: 24,
    comments: 6,
  },
  {
    id: "p2",
    kind: "인증",
    author: "이수민",
    day: 6,
    time: "어제 22:41",
    code: `for i in range(1, 10):
    print(f"7 x {i} = {7 * i}")`,
    body: `7단 출력까지 성공했어요. range 끝 숫자가 포함 안 되는 거 오늘 처음 알았어요 😅`,
    likes: 9,
    comments: 2,
    firstComment: { author: "박민호", body: "맞아요, 끝 숫자는 빠져요. 그래서 1부터 9까지면 range(1, 10)이에요 👍" },
  },
  {
    id: "p3",
    kind: "질문",
    author: "정우진",
    time: "어제 21:12",
    body: `Day 6 미션에서 리스트 합계를 구할 때 sum()을 써도 되나요? 아니면 for문으로 직접 더해야 하나요?`,
    likes: 3,
    comments: 4,
    firstComment: { author: "박민호", body: "오늘은 for문으로 직접 더해 보세요. sum()은 Day 18에 같이 봐요!" },
  },
  {
    id: "p4",
    kind: "인증",
    author: "김지은",
    day: 6,
    time: "어제 20:03",
    code: `scores = [82, 95, 71, 88]
total = 0
for s in scores:
    total += s
print(total / len(scores))`,
    body: `평균 84.0 나왔어요. 처음으로 남의 도움 없이 끝까지 짰어요.`,
    likes: 12,
    comments: 3,
  },
  {
    id: "p5",
    kind: "자유",
    author: "한예린",
    time: "어제 13:30",
    body: `점심시간에 강의 보는 분 있나요? 저는 회사 근처 카페에서 20분씩 보고 있어요. 생각보다 집중 잘 돼요.`,
    likes: 7,
    comments: 5,
  },
  {
    id: "p6",
    kind: "인증",
    author: "오준호",
    day: 6,
    time: "어제 08:15",
    body: `출근 전에 끝냈어요. 구구단 전체를 이중 for문으로 출력해 봤어요. 오늘도 🔥`,
    likes: 8,
    comments: 1,
  },
];

// 리더보드 (python-21). 같은 점수는 같은 순위예요.
export type Row = { name: string; level: number; points: number; streak: number; me?: boolean };
export const leaderboard: Record<"7일" | "30일" | "전체", Row[]> = {
  "7일": [
    { name: "오준호", level: 4, points: 82, streak: 7 },
    { name: "이수민", level: 4, points: 82, streak: 7 },
    { name: "한예린", level: 3, points: 74, streak: 6 },
    { name: "정우진", level: 3, points: 71, streak: 6 },
    { name: "박서연", level: 3, points: 66, streak: 5 },
    { name: "김지은", level: 3, points: 61, streak: 3, me: true },
    { name: "최도현", level: 2, points: 55, streak: 4 },
    { name: "윤하은", level: 2, points: 48, streak: 2 },
    { name: "강민재", level: 2, points: 40, streak: 0 },
    { name: "임채원", level: 2, points: 33, streak: 1 },
    { name: "서지호", level: 1, points: 15, streak: 0 },
    { name: "문가영", level: 1, points: 0, streak: 0 },
  ],
  "30일": [
    { name: "이수민", level: 4, points: 104, streak: 7 },
    { name: "오준호", level: 4, points: 98, streak: 7 },
    { name: "한예린", level: 3, points: 88, streak: 6 },
    { name: "정우진", level: 3, points: 85, streak: 6 },
    { name: "김지은", level: 3, points: 72, streak: 3, me: true },
    { name: "박서연", level: 3, points: 72, streak: 5 },
    { name: "최도현", level: 2, points: 61, streak: 4 },
    { name: "윤하은", level: 2, points: 52, streak: 2 },
    { name: "강민재", level: 2, points: 44, streak: 0 },
    { name: "임채원", level: 2, points: 38, streak: 1 },
    { name: "서지호", level: 1, points: 15, streak: 0 },
    { name: "문가영", level: 1, points: 0, streak: 0 },
  ],
  "전체": [
    { name: "이수민", level: 4, points: 104, streak: 7 },
    { name: "오준호", level: 4, points: 98, streak: 7 },
    { name: "한예린", level: 3, points: 88, streak: 6 },
    { name: "정우진", level: 3, points: 85, streak: 6 },
    { name: "김지은", level: 3, points: 72, streak: 3, me: true },
    { name: "박서연", level: 3, points: 72, streak: 5 },
    { name: "최도현", level: 2, points: 61, streak: 4 },
    { name: "윤하은", level: 2, points: 52, streak: 2 },
    { name: "강민재", level: 2, points: 44, streak: 0 },
    { name: "임채원", level: 2, points: 38, streak: 1 },
    { name: "서지호", level: 1, points: 15, streak: 0 },
    { name: "문가영", level: 1, points: 0, streak: 0 },
  ],
};

export const todayCheckins = { done: 19, total: 28 };

export const missionDetail: Record<number, { minutes: number; mission: string; hint: string }> = {
  7: {
    minutes: 18,
    mission: `1부터 차례로 더해 가다가 합이 100을 처음 넘는 순간 멈추는 프로그램을 while과 break로 만들어 보세요.

출력 예시
14까지 더하면 105예요.

짠 코드와 실행 결과를 함께 붙여 넣어 인증해 주세요.`,
    hint: "while True: 로 시작하고, 조건을 만족하면 break로 빠져나오면 돼요.",
  },
};

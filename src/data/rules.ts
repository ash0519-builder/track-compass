/**
 * 졸업요건·트랙 제도·비교과 제도 (한성대학교 공식 페이지 기준, 2026-11 확인)
 */
export const SOURCES = {
  graduation: { label: "교과 및 비교과 교육과정 이수체계", url: "https://www.hansung.ac.kr/hansung/6217/subview.do" },
  trackSystem: { label: "전공트랙제도 (트랙 선택·변경)", url: "https://www.hansung.ac.kr/hansung/6213/subview.do" },
  majorCredits: { label: "전공교육과정 이수학점", url: "https://www.hansung.ac.kr/hansung/6218/subview.do" },
  liberal: { label: "교양교육과정 (24학번 이후 최소 이수학점)", url: "https://www.hansung.ac.kr/hansung/6219/subview.do" },
  extracurricular: { label: "학생성공센터 비교과교육과정", url: "https://www.hansung.ac.kr/css/2639/subview.do" },
  hsp: { label: "HSP(High Success Project) 소개", url: "https://www.hansung.ac.kr/css/2649/subview.do" },
  certification: { label: "한성인재인증제", url: "https://www.hansung.ac.kr/css/2640/subview.do" },
  ideaContest: { label: "비교과 아이디어 공모전", url: "https://www.hansung.ac.kr/css/6840/subview.do" },
  challenge: { label: "한성인의 도전이야기", url: "https://www.hansung.ac.kr/css/2647/subview.do" },
  colleges: { label: "대학전체 (2027 개편 명칭 병기)", url: "https://www.hansung.ac.kr/hansung/6081/subview.do" },
  capstone: { label: "HSP 시스템 (캡스톤디자인 운영시스템)", url: "https://capstone.hansung.ac.kr/main.do" },
  studyGuide: { label: "2026-1 수강신청 안내 및 학업이수가이드", url: "https://www.hansung.ac.kr/bbs/hansung/2127/60429/download.do" },
  creditLimit: { label: "수강학점(학점이월제)", url: "https://www.hansung.ac.kr/hansung/6226/subview.do" },
  retake: { label: "수강신청·재수강 안내", url: "https://www.hansung.ac.kr/hansung/6225/subview.do" },
} as const;

/** 2016학번 이후 졸업요건 */
export const GRAD = {
  total: 130,
  major: 78,
  perTrack: 39,
  perTrackDetail: "전공기초 3 + 전공필수 15 + 전공선택 21",
  liberal: 31,
  liberalDetail: "24학번 이후: 교양필수 13 + 선택필수교양 15 + 자율 3",
  free: 21,
  extraPoints: 800,
  gpa: 2.0,
  semesterCap: 200,
  /** 16학번 이후 학기당 최대 수강신청 학점 */
  semesterMax: 18,
  /** 학점이월 포함 학기당 최대 취득 학점 (16학번 이후) */
  semesterMaxCarry: 21,
} as const;

/** 전공 하나의 최소 이수 학점 (17학번 이후, 전공교육과정 이수학점) */
export interface MajorSpec {
  /** 진행률·화면에 쓰는 이름 */
  label: string;
  total: number;
  basic: number;
  req: number;
  /** 전공필수 중 req학점만 고름 (부전공). 아니면 교육과정의 전공필수를 모두 넣음 */
  partialReq?: boolean;
}

export interface ModeRule {
  name: string;
  short: string;
  desc: string;
  /** 제1트랙(학과)이 '학과'여야 고를 수 있음 */
  deptOnly: boolean;
  a: MajorSpec;
  b: MajorSpec | null;
}

/** 이수 방식별 학점 구성. 창의융합대학 학과 심화전공은 전공필수 21학점 */
export const MODE_RULES: Record<"fusion1" | "fusion2" | "deep" | "undecided", ModeRule> = {
  fusion1: {
    name: "융합전공Ⅰ",
    short: "두 트랙",
    desc: "트랙·학과 2개를 각 39학점 (전공기초 3 + 전공필수 15 + 전공선택 21)",
    deptOnly: false,
    a: { label: "1트랙", total: 39, basic: 3, req: 15 },
    b: { label: "2트랙", total: 39, basic: 3, req: 15 },
  },
  fusion2: {
    name: "융합전공Ⅱ",
    short: "학과 + 부전공",
    desc: "학과 57학점 (기초 3 + 필수 15 + 선택 39) + 다른 트랙·학과 부전공 21학점 (기초 3 + 필수 12 + 선택 6)",
    deptOnly: true,
    a: { label: "학과 전공", total: 57, basic: 3, req: 15 },
    b: { label: "부전공", total: 21, basic: 3, req: 12, partialReq: true },
  },
  deep: {
    name: "심화전공",
    short: "제2트랙 없음",
    desc: "학과 하나를 78학점 (기초 3 + 필수 15 + 선택 60, 창의융합대학 학과는 필수 21 + 선택 54)",
    deptOnly: true,
    a: { label: "심화전공", total: 78, basic: 3, req: 15 },
    b: null,
  },
  undecided: {
    name: "제2트랙 미정",
    short: "1트랙만 먼저",
    desc: "제2트랙을 정하기 전까지 제1트랙 39학점만 먼저 계획",
    deptOnly: false,
    a: { label: "1트랙", total: 39, basic: 3, req: 15 },
    b: null,
  },
};

/** 24학번 이후 교양필수 (2026-1 학업이수가이드 기준). 권장 학기는 예시 배치. */
export const LIBERAL_REQUIRED: { sem: number; name: string; credit: number }[] = [
  { sem: 0, name: "사고와 표현", credit: 3 },
  { sem: 0, name: "영어커뮤니케이션(독해·작문)", credit: 2 },
  { sem: 0, name: "AI와 SW 기초", credit: 3 },
  { sem: 1, name: "영어커뮤니케이션(청취·회화)", credit: 2 },
  { sem: 1, name: "한성 이마기난스", credit: 3 },
];

/** 24학번 이후 선택필수교양 배분이수 영역: 4개 영역 이상에서 1과목 이상, 총 15학점 (교양교육과정) */
export const LIBERAL_AREAS = [
  { name: "인문학적 상상력", hint: "인문학 과목" },
  { name: "사회과학적 상상력", hint: "사회과학 과목" },
  { name: "과학기술 상상력", hint: "자연과학·공학 과목" },
  { name: "예술과 스포츠 상상력", hint: "예술·체육 과목" },
  { name: "융합적 상상력", hint: "융합교양 과목" },
] as const;

/** 상상력인재학부 2025학번 이후: 한성 이마기난스 대신 AI+X 전공탐색 */
export const IMAGINANCE_FREE_ALT = "AI+X 전공탐색";

/** 학번별 교양 졸업학점 (2026-1 학업이수가이드) */
export function liberalTotal(admission: number): number {
  if (admission >= 2024) return 31;
  if (admission >= 2019) return 28;
  if (admission >= 2017) return 22;
  return 24;
}

/** 선택할 수 있는 입학년도 (2016학번부터 비교과 800pt·130학점 기준) */
export const ADMISSION_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
export const CURRENT_YEAR = 2026;

/**
 * 비교과 로드맵 (학생성공센터 공식 프로그램). 포인트는 공식 페이지에 공개된 값만 숫자로 넣고,
 * 프로그램마다 달라지는 것은 label로 표시한다.
 */
export const EXTRA_PLAN: { sem: number; name: string; pts: number; label?: string; sub: string }[] = [
  { sem: 0, name: "학생성공센터 신입생 프로그램 확인", pts: 0, label: "확인", sub: "예비대학·대학생활길라잡이 등" },
  { sem: 1, name: "전공설계지도(Academic Advisor) 상담", pts: 0, label: "공지 확인", sub: "트랙 선택 전 지도교수 상담" },
  { sem: 1, name: "트라이앵글 트랙팀상담", pts: 0, label: "공지 확인", sub: "학생성공센터 트랙 선택 지원" },
  { sem: 3, name: "HSP(High Success Project) 3개월", pts: 100, sub: "팀 프로젝트 · 활동지원금 1인 10만원" },
  { sem: 7, name: "비교과포인트 800pt·한성인재인증 최종 점검", pts: 0, label: "점검", sub: "학기당 200pt 상한 고려" },
];

export const TRACK_RULES: { title: string; body: string }[] = [
  { title: "트랙 선택 시기", body: "2학년 진학 시 제1트랙과 제2트랙을 선택합니다. 신청 일정은 학사 공지(종합정보시스템)로 안내됩니다." },
  { title: "제1트랙", body: "소속 모집단위(학부) 안에서 반드시 1개 이상 선택합니다. 제2트랙은 다른 단과대학·학부에서도 자유롭게 고를 수 있고, 두 트랙은 학위·수강신청에서 동등합니다." },
  { title: "상상력인재학부", body: "2학년 진학 시 고른 제1트랙의 학부로 소속이 바뀝니다." },
  { title: "학과·전공 입학생", body: "뷰티디자인매니지먼트학과와 창의융합대학 학과 입학생은 제1전공을 본인 학과로 하고, 제2트랙을 자유롭게 고르거나, 제2트랙 없이 심화전공(학과 78학점) 또는 융합전공Ⅱ(학과 57학점 + 부전공 21학점)를 선택할 수 있습니다." },
  { title: "창의융합대학 학과를 제2트랙으로", body: "모집인원 주야별 30% 이내로 선발합니다." },
  { title: "컴퓨터공학부 트랙", body: "2023학번부터 트랙기초 과목(컴퓨터프로그래밍 또는 웹프로그래밍기초) 성취 기준을 충족한 학생만 해당 트랙을 선택할 수 있습니다." },
  { title: "주·야 교차", body: "주간은 주간 트랙만, 야간은 야간 트랙만 선택하는 것이 원칙입니다. 예외로 주간 학생은 야간 전용(게임그래픽디자인트랙)을, 야간 학생은 주간 전용 트랙을 제2트랙으로 고를 수 있습니다." },
  { title: "트랙 변경", body: "트랙제를 선택한 3~7학기 재학생이 2학년 2학기 직전 학기부터 신청할 수 있고, 제1·제2트랙 모두 변경 가능합니다. 이미 취득한 트랙 전공학점은 일반선택 학점으로 바뀌므로 신중해야 합니다." },
  { title: "다른 모집단위로 제1트랙 변경", body: "서로 다른 모집단위에서 1·2트랙을 고른 학생이 제1트랙을 본인 소속이 아닌 모집단위로 바꾸면 전부(과)에 해당해 별도 선발을 거칩니다." },
];

export const RENAMES_2027: { from: string; to: string }[] = [
  { from: "디자인대학", to: "AI디자인대학" },
  { from: "창의융합대학", to: "AI융합대학" },
  { from: "글로벌패션산업학부", to: "AI패션학부" },
  { from: "ICT디자인학부", to: "AI융합디자인학부" },
  { from: "뷰티디자인매니지먼트학과", to: "AI뷰티디자인학과" },
  { from: "기계전자공학부", to: "전기전자공학부" },
  { from: "디지털콘텐츠·가상현실트랙", to: "지능형실감미디어공학트랙 (2027년 11월 트랙 선택부터)" },
];

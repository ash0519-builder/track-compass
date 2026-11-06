import type { CollegeKey, Course, EntryUnit, Offer, Req, Track } from "../types";
import { CURRICULA } from "./curricula";

/**
 * 트랙 목록과 선택 규칙
 * - 트랙·학과 목록: 2026학년도 기준 (한성대 각 단과대학 홈페이지, 전공트랙제도 안내)
 *   https://www.hansung.ac.kr/hansung/6213/subview.do
 * - 예술학부(실기 전공)와 글로벌인재대학(외국인 유학생 대상)은 제외
 * - 관심·직무·강점 태그는 추천 계산용으로 각 트랙 교육과정을 보고 붙인 값이며 학교 공식 분류가 아님
 */
export const COLLEGES: Record<CollegeKey, { name: string; rename2027?: string }> = {
  HUM: { name: "크리에이티브인문예술대학" },
  SOC: { name: "미래융합사회과학대학" },
  DES: { name: "디자인대학", rename2027: "AI디자인대학" },
  ENG: { name: "IT공과대학" },
  CON: { name: "창의융합대학", rename2027: "AI융합대학" },
};

export const SCHOOL_RENAME_2027: Record<string, string> = {
  글로벌패션산업학부: "AI패션학부",
  ICT디자인학부: "AI융합디자인학부",
  뷰티디자인매니지먼트학과: "AI뷰티디자인학과",
  기계전자공학부: "전기전자공학부",
};

export const TAGS = {
  interests: ["프로그래밍", "데이터·AI", "디자인", "콘텐츠·미디어", "경영·마케팅", "금융·경제", "공공·법", "언어·문화", "역사·인문", "하드웨어·로봇", "패션·뷰티", "도시·공간", "보안", "글로벌"],
  jobs: ["개발자", "데이터분석가", "AI엔지니어", "UX/UI디자이너", "콘텐츠기획자", "게임·영상 아티스트", "마케터", "금융·회계", "공무원·공공기관", "무역·해외영업", "교육·한국어강사", "사서·큐레이터·기록관리", "엔지니어(HW)", "보안전문가", "창업"],
  strengths: ["논리·수리", "창의·표현", "소통·글쓰기", "분석·조사", "손재주·제작", "리더십·기획"],
} as const;

export type TagGroup = keyof typeof TAGS;
export const TAG_LIMITS: Record<TagGroup, number> = { interests: 4, jobs: 3, strengths: 3 };
export const TAG_LABELS: Record<TagGroup, string> = { interests: "관심 분야", jobs: "희망 직무", strengths: "나의 강점" };

/** 입학 모집단위 (2026학년도). 제1트랙은 소속 모집단위 안에서 골라야 한다. */
export const ENTRIES: EntryUnit[] = [
  { id: "상상력인재학부", name: "상상력인재학부 (자율전공)", college: "CON", free: true, days: ["주간"] },
  { id: "크리에이티브인문학부", name: "크리에이티브인문학부", college: "HUM", days: ["주간", "야간"] },
  { id: "사회과학부", name: "사회과학부", college: "SOC", days: ["주간", "야간"] },
  { id: "글로벌패션산업학부", name: "글로벌패션산업학부", college: "DES", days: ["주간", "야간"] },
  { id: "ICT디자인학부", name: "ICT디자인학부", college: "DES", days: ["주간", "야간"] },
  { id: "뷰티디자인매니지먼트학과", name: "뷰티디자인매니지먼트학과", college: "DES", dept: true, days: ["주간", "야간"] },
  { id: "컴퓨터공학부", name: "컴퓨터공학부", college: "ENG", days: ["주간", "야간"] },
  { id: "기계전자공학부", name: "기계전자공학부", college: "ENG", days: ["주간", "야간"] },
  { id: "산업시스템공학부", name: "산업시스템공학부", college: "ENG", days: ["주간", "야간"] },
  { id: "문학문화콘텐츠학과", name: "문학문화콘텐츠학과", college: "CON", dept: true, days: ["주간", "야간"] },
  { id: "AI응용학과", name: "AI응용학과", college: "CON", dept: true, days: ["주간", "야간"] },
  { id: "융합보안학과", name: "융합보안학과", college: "CON", dept: true, days: ["주간"] },
  { id: "미래모빌리티학과", name: "미래모빌리티학과", college: "CON", dept: true, days: ["주간"] },
];

function termToSem(term: string): number {
  if (term === "전학년") return 2;
  const m = term.match(/^(\d)-(\d)/);
  if (!m) return 0;
  return (Number(m[1]) - 1) * 2 + (Number(m[2]) - 1);
}

export function parseCurriculum(src: string): Course[] {
  return src
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [term, req, name, credit] = s.split("|");
      return { term, sem: termToSem(term), req: req as Req, name, credit: credit ? Number(credit) : 3, seasonal: term.includes("계절") };
    });
}

const HS = "https://www.hansung.ac.kr";

interface Meta {
  college: CollegeKey;
  school: string;
  kind?: "트랙" | "학과";
  offer?: Offer;
  path: string;
  i: string[];
  j: string[];
  s: string[];
  secondOnly?: boolean;
  selectiveSecond?: boolean;
  prerequisite?: string;
  rename2027?: string;
  dataNote?: string;
}

const M: Record<string, Meta> = {
  영미문화콘텐츠트랙: { college: "HUM", school: "크리에이티브인문학부", path: "/HmnArt/5643", i: ["언어·문화", "콘텐츠·미디어", "글로벌"], j: ["콘텐츠기획자", "무역·해외영업", "마케터"], s: ["소통·글쓰기", "창의·표현"] },
  영미언어정보트랙: { college: "HUM", school: "크리에이티브인문학부", path: "/HmnArt/5579", i: ["언어·문화", "데이터·AI", "글로벌"], j: ["교육·한국어강사", "무역·해외영업", "데이터분석가"], s: ["분석·조사", "소통·글쓰기"] },
  한국어교육트랙: { college: "HUM", school: "크리에이티브인문학부", offer: "주간", path: "/HmnArt/5586", i: ["언어·문화", "글로벌"], j: ["교육·한국어강사"], s: ["소통·글쓰기", "리더십·기획"] },
  역사문화큐레이션트랙: { college: "HUM", school: "크리에이티브인문학부", path: "/HmnArt/5629", i: ["역사·인문", "콘텐츠·미디어"], j: ["사서·큐레이터·기록관리", "콘텐츠기획자"], s: ["분석·조사", "창의·표현"] },
  역사콘텐츠트랙: { college: "HUM", school: "크리에이티브인문학부", path: "/HmnArt/5636", i: ["역사·인문", "콘텐츠·미디어"], j: ["콘텐츠기획자", "사서·큐레이터·기록관리"], s: ["소통·글쓰기", "창의·표현"] },
  지식정보문화트랙: { college: "HUM", school: "크리에이티브인문학부", path: "/HmnArt/5615", i: ["역사·인문", "데이터·AI"], j: ["사서·큐레이터·기록관리", "데이터분석가"], s: ["분석·조사"] },
  디지털인문정보학트랙: { college: "HUM", school: "크리에이티브인문학부", path: "/HmnArt/5622", i: ["역사·인문", "데이터·AI", "프로그래밍"], j: ["데이터분석가", "콘텐츠기획자", "사서·큐레이터·기록관리"], s: ["분석·조사", "논리·수리"] },

  국제무역트랙: { college: "SOC", school: "사회과학부", path: "/SclScn/5262", i: ["글로벌", "경영·마케팅", "금융·경제"], j: ["무역·해외영업"], s: ["소통·글쓰기", "분석·조사"] },
  글로벌비즈니스트랙: { college: "SOC", school: "사회과학부", path: "/SclScn/5269", i: ["글로벌", "경영·마케팅", "언어·문화"], j: ["무역·해외영업", "마케터", "창업"], s: ["리더십·기획", "소통·글쓰기"] },
  "기업·경제분석트랙": { college: "SOC", school: "사회과학부", path: "/SclScn/5276", i: ["금융·경제", "데이터·AI"], j: ["데이터분석가", "금융·회계", "공무원·공공기관"], s: ["분석·조사", "논리·수리"] },
  경제금융투자트랙: { college: "SOC", school: "사회과학부", path: "/SclScn/5283", i: ["금융·경제"], j: ["금융·회계"], s: ["논리·수리", "분석·조사"] },
  공공행정트랙: { college: "SOC", school: "사회과학부", path: "/SclScn/5297", i: ["공공·법", "데이터·AI"], j: ["공무원·공공기관"], s: ["리더십·기획", "분석·조사"] },
  "법&정책트랙": { college: "SOC", school: "사회과학부", path: "/SclScn/5305", i: ["공공·법"], j: ["공무원·공공기관"], s: ["분석·조사", "소통·글쓰기"] },
  부동산트랙: {
    college: "SOC", school: "사회과학부", path: "/SclScn/5316", i: ["도시·공간", "금융·경제"], j: ["금융·회계", "공무원·공공기관"], s: ["분석·조사"],
    dataNote: "교과목 로드맵(2023)에는 이수구분 대신 핵심·심화·활용 분류만 공개되어 있어 전공필수 여부는 트랙에 확인하세요.",
  },
  "스마트도시·교통계획트랙": { college: "SOC", school: "사회과학부", path: "/SclScn/5323", i: ["도시·공간", "데이터·AI", "공공·법"], j: ["공무원·공공기관", "데이터분석가"], s: ["분석·조사", "논리·수리"] },
  기업경영트랙: { college: "SOC", school: "사회과학부", path: "/SclScn/5330", i: ["경영·마케팅"], j: ["마케터", "창업"], s: ["리더십·기획", "소통·글쓰기"] },
  비즈니스애널리틱스트랙: { college: "SOC", school: "사회과학부", path: "/SclScn/5338", i: ["경영·마케팅", "데이터·AI"], j: ["데이터분석가", "마케터"], s: ["분석·조사", "논리·수리"] },
  "회계·재무경영트랙": { college: "SOC", school: "사회과학부", path: "/SclScn/5346", i: ["금융·경제", "경영·마케팅"], j: ["금융·회계"], s: ["논리·수리", "분석·조사"] },

  패션마케팅트랙: { college: "DES", school: "글로벌패션산업학부", path: "/Design/5105", i: ["패션·뷰티", "경영·마케팅"], j: ["마케터", "창업"], s: ["창의·표현", "리더십·기획"] },
  패션디자인트랙: { college: "DES", school: "글로벌패션산업학부", path: "/Design/5112", i: ["패션·뷰티", "디자인"], j: ["창업"], s: ["창의·표현", "손재주·제작"] },
  패션크리에이티브디렉션트랙: { college: "DES", school: "글로벌패션산업학부", path: "/Design/5119", i: ["패션·뷰티", "콘텐츠·미디어", "디자인"], j: ["콘텐츠기획자", "마케터"], s: ["창의·표현", "리더십·기획"] },
  미디어디자인트랙: { college: "DES", school: "ICT디자인학부", offer: "주간", path: "/Design/5126", i: ["디자인", "콘텐츠·미디어"], j: ["UX/UI디자이너", "콘텐츠기획자"], s: ["창의·표현"] },
  "영상·애니메이션디자인트랙": { college: "DES", school: "ICT디자인학부", offer: "주간", path: "/Design/5133", i: ["콘텐츠·미디어", "디자인"], j: ["게임·영상 아티스트", "콘텐츠기획자"], s: ["창의·표현", "손재주·제작"] },
  시각디자인트랙: { college: "DES", school: "ICT디자인학부", offer: "주간", path: "/Design/5147", i: ["디자인"], j: ["UX/UI디자이너", "마케터"], s: ["창의·표현"] },
  "VMD·전시디자인트랙": { college: "DES", school: "ICT디자인학부", offer: "주간", path: "/Design/5154", i: ["디자인", "도시·공간", "패션·뷰티"], j: ["마케터", "사서·큐레이터·기록관리"], s: ["창의·표현", "손재주·제작"] },
  인테리어디자인트랙: {
    college: "DES", school: "ICT디자인학부", offer: "주간", path: "/Design/5162", i: ["디자인", "도시·공간"], j: ["창업"], s: ["창의·표현", "손재주·제작"],
    dataNote: "교과목 로드맵(2025)에는 이수구분 대신 기초·핵심·심화·활용 분류만 공개되어 있어 전공필수 여부는 트랙에 확인하세요.",
  },
  게임그래픽디자인트랙: { college: "DES", school: "ICT디자인학부", offer: "야간", path: "/Design/5168", i: ["콘텐츠·미디어", "디자인"], j: ["게임·영상 아티스트"], s: ["창의·표현", "손재주·제작"] },
  "UX/UI디자인트랙": { college: "DES", school: "ICT디자인학부", offer: "주간", path: "/Design/5175", i: ["디자인", "프로그래밍"], j: ["UX/UI디자이너", "창업"], s: ["창의·표현", "분석·조사"] },
  뷰티디자인매니지먼트학과: { college: "DES", school: "뷰티디자인매니지먼트학과", kind: "학과", path: "/Design/5182", i: ["패션·뷰티", "경영·마케팅"], j: ["창업", "마케터"], s: ["손재주·제작", "창의·표현"], rename2027: "AI뷰티디자인학과" },

  모바일소프트웨어트랙: { college: "ENG", school: "컴퓨터공학부", path: "/Engineering/4889", i: ["프로그래밍"], j: ["개발자", "창업"], s: ["논리·수리", "손재주·제작"], prerequisite: "컴퓨터프로그래밍(CTE0001)" },
  빅데이터트랙: { college: "ENG", school: "컴퓨터공학부", path: "/Engineering/4896", i: ["데이터·AI", "프로그래밍"], j: ["데이터분석가", "AI엔지니어"], s: ["논리·수리", "분석·조사"], prerequisite: "컴퓨터프로그래밍(CTE0001)" },
  "디지털콘텐츠·가상현실트랙": { college: "ENG", school: "컴퓨터공학부", path: "/Engineering/4903", i: ["콘텐츠·미디어", "프로그래밍"], j: ["개발자", "게임·영상 아티스트"], s: ["창의·표현", "논리·수리"], prerequisite: "웹프로그래밍기초(CTE0002)", rename2027: "지능형실감미디어공학트랙" },
  웹공학트랙: { college: "ENG", school: "컴퓨터공학부", path: "/Engineering/4910", i: ["프로그래밍"], j: ["개발자", "창업"], s: ["논리·수리"], prerequisite: "웹프로그래밍기초(CTE0002)" },
  전자트랙: { college: "ENG", school: "기계전자공학부", path: "/Engineering/4917", i: ["하드웨어·로봇"], j: ["엔지니어(HW)"], s: ["논리·수리"] },
  시스템반도체트랙: { college: "ENG", school: "기계전자공학부", path: "/Engineering/4924", i: ["하드웨어·로봇"], j: ["엔지니어(HW)"], s: ["논리·수리", "분석·조사"] },
  기계시스템디자인트랙: {
    college: "ENG", school: "기계전자공학부", path: "/Engineering/4931", i: ["하드웨어·로봇", "디자인"], j: ["엔지니어(HW)"], s: ["손재주·제작", "논리·수리"],
    dataNote: "트랙 졸업요건: 15과목 중 13과목(39학점) 이상, 2~3학년 필수 5과목 중 4과목 이상, 4학년 캡스톤디자인(졸업논문) 필수.",
  },
  AI로봇융합트랙: {
    college: "ENG", school: "기계전자공학부", path: "/Engineering/4938", i: ["하드웨어·로봇", "데이터·AI", "프로그래밍"], j: ["AI엔지니어", "엔지니어(HW)"], s: ["논리·수리", "손재주·제작"],
    dataNote: "트랙 졸업요건: 15과목 중 13과목(39학점) 이상, 2~3학년 필수 5과목 중 4과목 이상, 4학년 캡스톤디자인(졸업논문) 필수.",
  },
  산업공학트랙: { college: "ENG", school: "산업시스템공학부", path: "/Engineering/4994", i: ["데이터·AI", "경영·마케팅"], j: ["데이터분석가"], s: ["분석·조사", "논리·수리"] },
  응용산업데이터공학트랙: { college: "ENG", school: "산업시스템공학부", path: "/Engineering/5022", i: ["데이터·AI", "프로그래밍"], j: ["데이터분석가", "AI엔지니어"], s: ["논리·수리", "분석·조사"] },

  문학문화콘텐츠학과: { college: "CON", school: "문학문화콘텐츠학과", kind: "학과", path: "/CreCon/2771", i: ["콘텐츠·미디어", "언어·문화", "역사·인문"], j: ["콘텐츠기획자"], s: ["소통·글쓰기", "창의·표현"], selectiveSecond: true },
  AI응용학과: { college: "CON", school: "AI응용학과", kind: "학과", path: "/CreCon/2779", i: ["데이터·AI", "프로그래밍"], j: ["AI엔지니어", "개발자", "데이터분석가"], s: ["논리·수리"], selectiveSecond: true },
  융합보안학과: { college: "CON", school: "융합보안학과", kind: "학과", offer: "주간", path: "/CreCon/2789", i: ["보안", "프로그래밍"], j: ["보안전문가", "개발자"], s: ["논리·수리", "분석·조사"], selectiveSecond: true },
  미래모빌리티학과: { college: "CON", school: "미래모빌리티학과", kind: "학과", offer: "주간", path: "/CreCon/2798", i: ["하드웨어·로봇", "데이터·AI", "도시·공간"], j: ["엔지니어(HW)", "AI엔지니어"], s: ["논리·수리", "손재주·제작"], selectiveSecond: true },
  창업트랙: {
    college: "CON", school: "창의융합대학", path: "/CreCon/7500", i: ["경영·마케팅", "데이터·AI"], j: ["창업"], s: ["리더십·기획", "창의·표현"], secondOnly: true,
    dataNote: "2026학년도 신설, 제2트랙으로만 선택 가능. 전공필수 일부는 계절학기, 4학년 학기 미정 과목은 4-1에 배치. 경일대·동의대·호서대 공유교과는 제외했어요.",
  },
};

export const TRACKS: Track[] = Object.entries(M).map(([name, m]) => ({
  name,
  college: m.college,
  school: m.school,
  kind: m.kind ?? "트랙",
  offer: m.offer ?? "주야",
  secondOnly: m.secondOnly,
  selectiveSecond: m.selectiveSecond,
  prerequisite: m.prerequisite,
  rename2027: m.rename2027,
  source: `${HS}${m.path}/subview.do`,
  dataNote: m.dataNote,
  interests: m.i,
  jobs: m.j,
  strengths: m.s,
  courses: parseCurriculum(CURRICULA[name] ?? ""),
}));

export const findTrack = (name: string) => TRACKS.find((t) => t.name === name) ?? null;
export const findEntry = (id: string) => ENTRIES.find((e) => e.id === id) ?? ENTRIES[0];

export const SEM_NAMES = ["1학년 1학기", "1학년 2학기", "2학년 1학기", "2학년 2학기", "3학년 1학기", "3학년 2학기", "4학년 1학기", "4학년 2학기"];

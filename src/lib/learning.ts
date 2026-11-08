import { IMAGINANCE_FREE_ALT, LIBERAL_REQUIRED } from "../data/rules";
import { TRACKS } from "../data/tracks";
import type { Grade, Req, TakenCourse, Track } from "../types";
import { normName } from "./text";

/** 학습 데이터 분석
 * 1) 성적표 붙여넣기를 과목명·성적·학점으로 읽는다 (정규식, 교육과정 과목명 사전과 대조)
 * 2) 트랙마다 '들은 과목이 얼마나 가까운지 × 성적'을 0~1로 계산한다
 *    같은 트랙 교육과정 과목 1.0 (전공기초 1.2, 전공필수 1.1) > 같은 학부 다른 트랙 0.5 > 같은 단과대학 0.25 > 과목명 키워드가 트랙 관심 분야와 같음 0.3
 */

export const GRADES: Grade[] = ["A+", "A0", "B+", "B0", "C+", "C0", "D+", "D0", "F", "P", "NP"];
export const GRADE_POINT: Record<Grade, number | null> = { "A+": 4.5, A0: 4.0, "B+": 3.5, B0: 3.0, "C+": 2.5, C0: 2.0, "D+": 1.5, D0: 1.0, F: 0, P: null, NP: null };
export const passed = (g: Grade) => g !== "F" && g !== "NP";
/** 성적 반영 비율: A+ 1.0 … D0 0.5, P 0.8, 미이수 0 */
export const gradeFactor = (g: Grade) => (g === "P" ? 0.8 : passed(g) ? 0.5 + 0.5 * ((GRADE_POINT[g] ?? 0) - 1) / 3.5 : 0);

const REQ_WEIGHT: Record<Req, number> = { 기: 1.2, 필: 1.1, 선: 1.0 };

export interface CatalogEntry {
  name: string;
  liberal: boolean;
  offers: { track: Track; req: Req; credit: number; term: string }[];
}

/** 이 앱이 아는 모든 과목 (44개 트랙 교육과정 + 교양필수) */
export const CATALOG: Map<string, CatalogEntry> = (() => {
  const m = new Map<string, CatalogEntry>();
  const liberal = [
    ...LIBERAL_REQUIRED.map((x) => [x.name, x.credit] as const),
    [IMAGINANCE_FREE_ALT, 3] as const,
    ["사고와 표현(읽기와 쓰기)", 2] as const,
    ["사고와 표현(발표와 토론)", 2] as const,
    ["문제해결을 위한 코딩 첫걸음", 2] as const,
  ];
  for (const [name] of liberal) m.set(normName(name), { name, liberal: true, offers: [] });
  for (const t of TRACKS)
    for (const c of t.courses) {
      const k = normName(c.name);
      const e = m.get(k) ?? { name: c.name, liberal: false, offers: [] };
      e.offers.push({ track: t, req: c.req, credit: c.credit, term: c.term });
      m.set(k, e);
    }
  return m;
})();

export const CATALOG_NAMES = [...CATALOG.values()].map((e) => e.name).sort((a, b) => a.localeCompare(b, "ko"));
const LIBERAL_CREDIT = new Map([...LIBERAL_REQUIRED.map((x) => [normName(x.name), x.credit] as const)]);

export const lookupCourse = (name: string) => CATALOG.get(normName(name)) ?? null;
export const creditOf = (c: TakenCourse) => c.credit ?? lookupCourse(c.name)?.offers[0]?.credit ?? LIBERAL_CREDIT.get(normName(c.name)) ?? 3;

const SORTED_KEYS = [...CATALOG.keys()].filter((k) => k.length >= 2).sort((a, b) => b.length - a.length);

/** 이수구분·학기 같은 표 머리글과 열 이름 (과목명에서 뺀다) */
const NOISE = /(교양필수|교양선택|선택필수교양|전공기초|전공필수|전공선택|일반선택|자유선택|교필|교선|전기|전필|전선|일선|재수강|이수구분|과목명|교과목명|학점|성적|등급|평점|학년도|[12]학기|하계|동계|계절)/g;
const GRADE_RE = /(?:^|[\s\t|,/])(A\+|A0|B\+|B0|C\+|C0|D\+|D0|NP|F|P|A|B|C|D)(?=$|[\s\t|,/])/g;
const SHORT: Record<string, Grade> = { A: "A0", B: "B0", C: "C0", D: "D0" };

export interface ParseResult {
  courses: TakenCourse[];
  /** 성적은 찾았지만 교육과정 과목명과 맞지 않는 줄 (그대로 과목으로 넣음) */
  unknown: string[];
  /** 과목도 성적도 못 찾은 줄 수 */
  skipped: number;
}

/**
 * 종합정보시스템 성적 조회 화면을 복사해 붙여넣은 글에서 과목명·성적·학점을 읽는다.
 * 줄마다 교육과정에 있는 가장 긴 과목명을 찾고, 과목명을 뺀 나머지에서 성적(A+…F, P/NP)과 학점(1~4)을 찾는다.
 * 같은 과목이 여러 번 나오면 뒤의 것(재수강)을 쓴다.
 */
export function parseTranscript(text: string): ParseResult {
  const byKey = new Map<string, TakenCourse>();
  const unknown: string[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length < 2) continue;
    const squashed = normName(line);
    const key = SORTED_KEYS.find((k) => squashed.includes(k));
    let rest = line;
    let name: string | null = null;
    if (key) {
      name = CATALOG.get(key)!.name;
      // 원문에서 과목명 부분을 지운다 (글자 사이 공백·기호 허용)
      const chars = [...key].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const loose = new RegExp(chars.join("[\\s()（）\\[\\]·ㆍ.,:;\\-_/&'\"]*"), "i");
      rest = line.replace(loose, " ");
    }
    const grades = [...rest.matchAll(GRADE_RE)].map((m) => ({ g: m[1], at: m.index ?? 0 }));
    const last = grades[grades.length - 1];
    if (!last) {
      if (!name) skipped++;
      continue;
    }
    const grade = (SHORT[last.g] ?? last.g) as Grade;
    const before = rest.slice(0, last.at);
    const nums = [...before.matchAll(/(?:^|\s)([1-4])(?:\.0)?(?=\s|$)/g)].map((m) => Number(m[1]));
    const credit = nums.length ? nums[nums.length - 1] : undefined;
    if (!name) {
      const guess = before
        .replace(NOISE, " ")
        .replace(/\b[A-Z]{2,5}\d{3,5}\b/g, " ")
        .replace(/\d+(\.\d+)?/g, " ")
        .replace(/[|\t,/]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (guess.length < 2 || !/[가-힣A-Za-z]/.test(guess)) {
        skipped++;
        continue;
      }
      name = guess.slice(0, 40);
      unknown.push(name);
    }
    byKey.set(normName(name), { name, grade, ...(credit ? { credit } : {}) });
  }
  return { courses: [...byKey.values()], unknown, skipped };
}

/** 평균 평점 (P/NP 제외, 4.5 만점) */
export function gpaOf(taken: readonly TakenCourse[]): number | null {
  let sum = 0;
  let cr = 0;
  for (const c of taken) {
    const pt = GRADE_POINT[c.grade];
    if (pt === null) continue;
    sum += pt * creditOf(c);
    cr += creditOf(c);
  }
  return cr ? Math.round((sum / cr) * 100) / 100 : null;
}

export const earnedCredits = (taken: readonly TakenCourse[]) => taken.filter((c) => passed(c.grade)).reduce((s, c) => s + creditOf(c), 0);

/** 과목명 키워드 → 관심 분야 (전공별 키워드) */
const COURSE_KW: [RegExp, string][] = [
  [/프로그래밍|코딩|소프트웨어|SW|알고리즘|자료구조|운영체제|웹|모바일|객체지향|파이썬|자바|컴퓨터|시스템프로그래밍/i, "프로그래밍"],
  [/데이터|AI|인공지능|머신러닝|딥러닝|통계|빅데이터|애널리틱스|확률|선형대수/i, "데이터·AI"],
  [/디자인|타이포|드로잉|색채|UX|UI|그래픽|일러스트|조형/i, "디자인"],
  [/콘텐츠|미디어|영상|방송|애니메이션|게임|스토리|출판/, "콘텐츠·미디어"],
  [/경영|마케팅|회계|재무|조직|인사|전략|브랜드|광고|소비자|유통/, "경영·마케팅"],
  [/경제|금융|투자|재정|화폐|증권/, "금융·경제"],
  [/법|행정|정책|정치|공공|헌법|거버넌스/, "공공·법"],
  [/영어|영미|일본|중국|언어|문학|한국어|외국어|번역/, "언어·문화"],
  [/역사|철학|인문|고전|기록|도서관|문헌|아카이브|큐레이션/, "역사·인문"],
  [/회로|전자|기계|로봇|반도체|임베디드|제어|역학|모빌리티|자동차|센서|물리/, "하드웨어·로봇"],
  [/패션|의류|뷰티|메이크업|헤어|화장품|텍스타일|코스메틱/, "패션·뷰티"],
  [/도시|부동산|건축|교통|공간|인테리어|부동산/, "도시·공간"],
  [/보안|암호|해킹|포렌식|네트워크/, "보안"],
  [/글로벌|국제|해외|무역|다문화/, "글로벌"],
];

export const courseTags = (name: string) => COURSE_KW.filter(([re]) => re.test(name)).map(([, tag]) => tag);

export interface LearnFit {
  /** 0~1 */
  score: number;
  /** 이 트랙 교육과정에 있는 과목 */
  direct: TakenCourse[];
  /** 같은 학부 다른 트랙 과목 수 */
  sameSchool: number;
  /** 같은 단과대학 과목 수 */
  sameCollege: number;
  /** 키워드가 맞는 과목 */
  keyword: TakenCourse[];
  /** 이 트랙 과목 평균 평점 */
  trackGpa: number | null;
  /** 이 트랙 교육과정 과목 중 F·NP */
  failed: TakenCourse[];
}

/** 학습 점수 만점 기준: 성적 A+ 기준 약 5과목(15학점) */
export const LEARN_FULL = 15;

const cache = new WeakMap<readonly TakenCourse[], Map<string, LearnFit>>();

export function learnFit(t: Track, taken: readonly TakenCourse[] | undefined): LearnFit | null {
  if (!taken?.length) return null;
  let byTrack = cache.get(taken);
  if (!byTrack) cache.set(taken, (byTrack = new Map()));
  const hit = byTrack.get(t.name);
  if (hit) return hit;

  let pts = 0;
  const r: LearnFit = { score: 0, direct: [], sameSchool: 0, sameCollege: 0, keyword: [], trackGpa: null, failed: [] };
  for (const c of taken) {
    const entry = lookupCourse(c.name);
    const offers = entry?.offers ?? [];
    const own = offers.find((o) => o.track === t);
    if (!passed(c.grade)) {
      if (own) {
        r.failed.push(c);
        pts -= creditOf(c) * 0.3;
      }
      continue;
    }
    const w = creditOf(c) * gradeFactor(c.grade);
    if (own) {
      pts += w * REQ_WEIGHT[own.req];
      r.direct.push(c);
    } else if (offers.some((o) => o.track.school === t.school && o.track !== t)) {
      pts += w * 0.5;
      r.sameSchool++;
    } else if (offers.some((o) => o.track.college === t.college)) {
      pts += w * 0.25;
      r.sameCollege++;
    } else if (!entry?.liberal && courseTags(c.name).some((x) => t.interests.includes(x))) {
      pts += w * 0.3;
      r.keyword.push(c);
    }
  }
  r.score = Math.max(0, Math.min(1, pts / LEARN_FULL));
  r.trackGpa = gpaOf(r.direct);
  byTrack.set(t.name, r);
  return r;
}

/** 학습 데이터가 추천에 쓰일 만큼 있는지 (교육과정에서 찾은 이수 과목 1개 이상) */
export const hasLearning = (taken: readonly TakenCourse[] | undefined) => !!taken?.some((c) => passed(c.grade));

/** 들은 과목으로 본 관심 분야 (학점 × 성적 합) */
export function interestsFromCourses(taken: readonly TakenCourse[] | undefined): { tag: string; credits: number }[] {
  const m = new Map<string, number>();
  for (const c of taken ?? []) {
    if (!passed(c.grade) || lookupCourse(c.name)?.liberal) continue;
    const tags = new Set([...courseTags(c.name), ...(lookupCourse(c.name)?.offers.flatMap((o) => o.track.interests.slice(0, 1)) ?? [])]);
    for (const tag of tags) m.set(tag, (m.get(tag) ?? 0) + creditOf(c));
  }
  return [...m.entries()].map(([tag, credits]) => ({ tag, credits })).sort((a, b) => b.credits - a.credits);
}

/** 학습 근거 한 줄 (추천 이유용) */
export function learnReason(lf: LearnFit | null): string {
  if (!lf) return "";
  const bits: string[] = [];
  if (lf.direct.length)
    bits.push(`이 트랙 과목 ${lf.direct.slice(0, 3).map((c) => `'${c.name}'(${c.grade})`).join(", ")}${lf.direct.length > 3 ? ` 외 ${lf.direct.length - 3}개` : ""} 이수`);
  if (lf.sameSchool) bits.push(`같은 학부 과목 ${lf.sameSchool}개`);
  if (lf.sameCollege) bits.push(`같은 단과대학 과목 ${lf.sameCollege}개`);
  if (lf.keyword.length) bits.push(`관련 키워드 과목 ${lf.keyword.length}개`);
  if (lf.failed.length) bits.push(`미이수(F) ${lf.failed.map((c) => c.name).join(", ")}`);
  return bits.join(", ");
}

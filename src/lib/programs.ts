import { PROGRAMS, type Program } from "../data/programs";
import type { Profile, Track } from "../types";

/** 비교과 카테고리. 영어·외국어처럼 학생이 찾는 주제로 묶는다. */
export const THEMES = [
  { id: "english", label: "영어·외국어", re: /영어|english|토익|toeic|toefl|ielts|opic|오픽|스피킹|speaking|외국어|중국어|일본어|어학연수|conversation|영어회화|global culture|통번역|open activity|group speak|원어민|미국|영어권|캐나다|호주|영국/i },
  { id: "ai", label: "AI·SW·데이터", re: /\bai\b|\bax\b|인공지능|파이썬|python|코딩|\bsw\b|소프트웨어|데이터|클라우드|빅데이터|해커톤|프로그래밍|gpt|생성형|ai-native|ai활용|ai 활용|노코드/i },
  { id: "career", label: "진로·취업", re: /취업|채용|직무|현직자|자기소개서|자소서|면접|포트폴리오|진로|커리어|박람회|인턴|\[대플\]|대플|기업설명회|토크 ?콘서트|공기업|nc[s]/i },
  { id: "startup", label: "창업", re: /창업|스타트업|startup|ir 피칭|사업계획|비즈니스 ?모델/i },
  { id: "global", label: "해외·글로벌", re: /글로벌|해외|단기연수|교환학생|국제|global|연수/i },
  { id: "study", label: "학습·글쓰기", re: /튜터링|lbt|학습|글쓰기|독서|표현능력|러닝|스터디|리터러시|인문지식|에세이|논술/i },
  { id: "contest", label: "공모전·대회", re: /공모전|대회|경진|콘테스트|챌린지|해커톤/i },
  { id: "counsel", label: "상담·심리", re: /상담|심리|검사|마음|힐링|스트레스|진단/i },
  { id: "volunteer", label: "봉사·ESG", re: /봉사|esg|캠페인|나눔|기부|환경|멘토링 봉사/i },
  { id: "major", label: "전공 특강·체험", re: /$^/ },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];

/** 진로 진단 항목 → 비교과 키워드 */
const INTEREST_KW: Record<string, RegExp> = {
  프로그래밍: /코딩|프로그래밍|\bsw\b|소프트웨어|개발|해커톤|python|파이썬|웹|앱/i,
  "데이터·AI": /\bai\b|ax|인공지능|데이터|빅데이터|머신러닝|생성형|gpt|python|파이썬/i,
  디자인: /디자인|ux|ui|그래픽|design/i,
  "콘텐츠·미디어": /콘텐츠|영상|미디어|크리에이터|유튜브|방송|사진|웹툰|영화|문콘/i,
  "경영·마케팅": /경영|마케팅|브랜드|비즈니스|광고|b2b|세일즈|기업/i,
  "금융·경제": /금융|경제|투자|주식|회계|재무|세무|은행|증권/i,
  "공공·법": /공공|행정|정책|법|공무원|공기업|정부/,
  "언어·문화": /영어|english|외국어|언어|한국어|통번역|글쓰기|스피치|문학/i,
  "역사·인문": /역사|인문|독서|문헌|도서관|철학|고전|문화유산|박물관/,
  "하드웨어·로봇": /로봇|반도체|전자|하드웨어|드론|임베디드|기계|모빌리티|공학/,
  "패션·뷰티": /패션|뷰티|메이크업|스타일/,
  "도시·공간": /도시|부동산|공간|교통|인테리어|건축|지역/,
  보안: /보안|해킹|ctf|정보보호|사이버/i,
  글로벌: /글로벌|해외|국제|단기연수|global|무역|영어/i,
};

const JOB_KW: Record<string, RegExp> = {
  개발자: /개발|코딩|\bsw\b|소프트웨어|해커톤|프로그래밍|클라우드|웹|앱/i,
  데이터분석가: /데이터|분석|python|파이썬|sql|통계|빅데이터/i,
  AI엔지니어: /\bai\b|ax|인공지능|머신러닝|딥러닝|생성형/i,
  "UX/UI디자이너": /ux|ui|디자인|포트폴리오/i,
  콘텐츠기획자: /콘텐츠|기획|영상|미디어|크리에이터|홍보/,
  "게임·영상 아티스트": /게임|영상|애니|그래픽|아트|웹툰/,
  마케터: /마케팅|브랜드|광고|홍보|sns|b2b/i,
  "금융·회계": /금융|회계|세무|투자|증권|은행|재무/,
  "공무원·공공기관": /공무원|공공|행정|정책|공기업|ncs/i,
  "무역·해외영업": /무역|해외|글로벌|영어|b2b|kita|수출/i,
  "교육·한국어강사": /한국어|교육|튜터|lbt|강사|가르/i,
  "사서·큐레이터·기록관리": /도서관|문헌정보|사서|큐레이|전시|아카이브|기록/,
  "엔지니어(HW)": /공학|반도체|전자|기계|로봇|하드웨어|엔지니어/,
  보안전문가: /보안|해킹|ctf|정보보호/i,
  창업: /창업|스타트업|사업계획/,
};

const STRENGTH_KW: Record<string, RegExp> = {
  "논리·수리": /수학|코딩|알고리즘|데이터|분석/,
  "창의·표현": /공모전|아이디어|창작|디자인|사진|영상/,
  "소통·글쓰기": /글쓰기|스피치|표현|발표|토론|에세이|기자/,
  "분석·조사": /분석|연구|데이터|조사|리서치/,
  "손재주·제작": /제작|실습|워크숍|메이킹|만들기/,
  "리더십·기획": /리더십|기획|프로젝트|홍보단|서포터즈|대사/,
};

/** 오늘 날짜 (사용자 기기 기준, YYYY-MM-DD) */
export function todayISO(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** 로드맵에 넣을 때 '2026-1', '26-2학기' 같은 지난 학기 표기를 뗀 이름 */
const SEASON = "(?:하계|동계|여름|겨울)\\s*(?:학기|방학)?";
const TERM = `(?:[12]\\s*학기|[12](?![0-9])|${SEASON})`;
/** 2026-2학기, 26-2학기, 2026학년도 2학기, 2026년 하계학기, 2026-1) 같은 운영 시기 표기 */
const DATE_RE = new RegExp(`(^|[^0-9])(?:20\\d\\d|2\\d(?=\\s*[-–]))\\s*(?:학년도|년도|년)?\\s*(?:[-–.]\\s*)?(?:${TERM})?\\s*(?:학년도)?\\s*\\)?`, "g");

/** "학습컨설팅 학습컨설팅 2차"처럼 그룹명과 회차명이 겹친 앞부분을 한 번만 남긴다 */
function collapseRepeat(t: string): string {
  const w = t.split(" ");
  for (let k = Math.floor(w.length / 2); k >= 1; k--) {
    const head = w.slice(0, k).join("");
    const rest = w.slice(k).join(" ");
    if (head.length >= 2 && rest.replace(/\s+/g, "").startsWith(head)) return rest;
  }
  return t;
}

/** 학기·연도 표기와 운영 태그를 뺀 프로그램 이름 (자동 추천에 쓰는 대표 이름) */
export function cleanProgramName(t: string): string {
  const out = t
    .replace(/\[(인재인증|대플|재맞고|졸특)\]\s*/g, "")
    .replace(DATE_RE, (_m, pre: string) => `${pre} `)
    .replace(/_[A-Za-z]+(?=\s|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s_:·)\]–-]+|[\s_:·(\[–-]+$/g, "")
    .trim();
  return collapseRepeat(out) || t;
}

export const textOf = (p: Program) => `${p.t} ${p.k} ${p.d}`;

/** 같은 프로그램 묶음 이름 (전반기·후반기, 회차, 반 이름, '외 N건'을 뺌) — 추천 중복 제거용 */
export const familyName = (t: string) =>
  cleanProgramName(t)
    .replace(/전반기|후반기|상반기|하반기|\d+\s*차|제\s*\d+\s*회|\([^)]*\)|외\s*\d+\s*건|_[^ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function themesOf(p: Program): ThemeId[] {
  const txt = textOf(p);
  const head = `${p.t} ${p.k}`;
  // 영어·AI·해외는 소개글 속 단어 하나로 잘못 묶이기 쉬워 이름·해시태그로만 판단
  const headOnly = new Set<string>(["english", "ai", "global"]);
  const out = THEMES.filter((t) => (headOnly.has(t.id) ? t.re.test(head) : t.re.test(txt))).map((t) => t.id) as ThemeId[];
  if (p.c1 === "창업지원" && !out.includes("startup")) out.push("startup");
  if (p.c1 === "상담·심리지원" && !out.includes("counsel")) out.push("counsel");
  if (p.c1 === "진로·취업지원" && !out.includes("career")) out.push("career");
  if (p.c2 === "공모전·대회" && !out.includes("contest")) out.push("contest");
  if (p.c2 === "봉사" && !out.includes("volunteer")) out.push("volunteer");
  if (p.c1 === "전공역량강화" && !out.includes("major")) out.push("major");
  if (p.c1 === "학습역량강화" && !out.length) out.push("study");
  return out;
}

/** open: 지금 신청 가능, running: 신청 마감·운영 중, closed: 종료 (다음 학기 운영 공지 확인) */
export type Status = "open" | "running" | "closed";
export function statusOf(p: Program, today = todayISO()): Status {
  if (p.ae >= today) return "open";
  if (p.e >= today) return "running";
  return "closed";
}
export const STATUS_LABEL: Record<Status, string> = { open: "신청 가능", running: "운영 중·신청 마감", closed: "종료 · 다음 학기 공지 확인" };

/** 'YYYY-MM-DD' → 학기 라벨 (3~8월 1학기, 9~2월 2학기) */
export function semesterLabel(sem: string) {
  const [y, s] = sem.split("-");
  return `${y}-${s}학기`;
}

const short = (t: Track) => t.name.replace(/(트랙|학과)$/, "").replace(/·/g, "");

export interface Scored {
  p: Program;
  score: number;
  reasons: string[];
  themes: ThemeId[];
  /** 특정 학부·학과 대상인데 내 전공이 아니면 false */
  eligible: boolean;
  /** 대상 학부·학과 (특정 전공 대상일 때) */
  audience: string | null;
  /** 듣기 좋은 학년 */
  years: number[] | null;
}

/** 특정 학부·학과 대상 프로그램이면 그 이름 (전공역량강화 + 운영 부서가 학부·학과) */
export function audienceOf(p: Program): string | null {
  if (p.c1 !== "전공역량강화") return null;
  const m = /([가-힣A-Za-z&·]+(?:학부|학과|전공))(?:\s|$)/.exec(p.o);
  return m ? m[1] : null;
}

/** 듣기 좋은 학년 (이름·해시태그·소개의 대상 표현으로 판단) */
export function yearsOf(p: Program): number[] | null {
  const head = `${p.t} ${p.k}`;
  const target = /대상\s*[:：]?[^.。\n]{0,40}?([1-4])\s*학년/.exec(p.d);
  if (target) return [Number(target[1])];
  if (/신입생|새내기|예비대학|1학년|대학생활|트랙진로탐색|전공탐색|트랙 ?선택/.test(head)) return [1];
  if (/졸업생|졸업예정|졸업작품|4학년/.test(head)) return [4];
  if (/취업|채용|면접|자기소개서|자소서|이력서|현장실습|인턴|IPP|직무|포트폴리오|박람회|기업설명회/i.test(head)) return [3, 4];
  if (/진로탐색|진로 ?멘토링|진로특강|적성/.test(head)) return [1, 2];
  return null;
}

/** 비교과 로드맵 단계: 1 입문(가볍게 경험) → 2 성장(꾸준히 참여) → 3 도전(성과·기록) */
export type Stage = 1 | 2 | 3;
export const STAGES: { n: Stage; name: string; desc: string }[] = [
  { n: 1, name: "입문", desc: "가볍게 경험하며 방향 잡기" },
  { n: 2, name: "성장", desc: "꾸준히 참여하며 실력 쌓기" },
  { n: 3, name: "도전", desc: "대회·연수·실습으로 성과 남기기" },
];
const days = (p: Program) => Math.max(1, Math.round((Date.parse(p.e) - Date.parse(p.s)) / 86400000) + 1);
export function stageOf(p: Program): Stage {
  const head = `${p.t} ${p.k}`;
  if (p.c2 === "공모전·대회" || /대회|공모전|경진|챌린지|해커톤/.test(head)) return 3;
  if (/단기연수|어학연수|해외연수|교환학생|현장실습|인턴십|IPP|HSP/i.test(head)) return 3;
  if (p.c2 === "상담·검사" || /코너|corner|특강|설명회|검사|오리엔테이션|박람회|투어|세미나|토크/i.test(head) || (p.c2 === "특강·워크숍" && days(p) <= 2)) return 1;
  if (/서포터즈|발표회|프로젝트|데모데이/.test(head)) return 3;
  return 2;
}

/** 운영 시기 안내: 지금 열려 있으면 날짜, 아니면 지난 운영 학기로 다음 시기 예상 */
export function runText(p: Program, today = todayISO()): string {
  const st = statusOf(p, today);
  const md = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`;
  if (st === "open") return `신청 ~${md(p.ae)} · 운영 ${md(p.s)}${p.e !== p.s ? `~${md(p.e)}` : ""}`;
  if (st === "running") return `운영 중 ~${md(p.e)}`;
  const terms = new Set(p.sems.map((x) => x.split("-")[1]));
  const month = Number(p.s.slice(5, 7));
  const vac = month === 1 || month === 2 || month === 7 || month === 8 ? (month <= 2 ? "겨울방학" : "여름방학") : `${month}월`;
  return `${terms.size > 1 ? "매 학기" : terms.has("1") ? "1학기" : "2학기"} ${vac}쯤 운영 (지난 운영 ${p.sems.map(semesterLabel).join(", ")})`;
}

/** 담을 학기 추천: minSem 이후, 1학기에만 열리면 1학기 쪽(짝수 인덱스)으로 */
export function suggestSem(p: Program, minSem: number, today = todayISO()): number {
  const from = Math.min(7, Math.max(0, minSem));
  if (statusOf(p, today) !== "closed") return from;
  const terms = new Set(p.sems.map((x) => x.split("-")[1]));
  if (terms.size !== 1) return from;
  const parity = terms.has("1") ? 0 : 1;
  for (let s = from; s < 8; s++) if (s % 2 === parity) return s;
  return 7;
}

export interface GoalStep {
  stage: (typeof STAGES)[number];
  items: { r: Scored; sem: number }[];
}

/** 목표(카테고리) 하나의 단계별 비교과 로드맵 */
export function goalPath(theme: ThemeId, recs: Scored[], now: number, per = 3, today = todayISO()): GoalStep[] {
  const seen = new Set<string>();
  const pool = recs.filter((r) => r.eligible && r.themes.includes(theme));
  return STAGES.map((stage, k) => {
    const items: { r: Scored; sem: number }[] = [];
    let majorOnly = 0;
    for (const r of pool) {
      if (items.length >= per) break;
      if (stageOf(r.p) !== stage.n) continue;
      // 학부·학과 전용 프로그램은 단계마다 2개까지만 (학교 전체 프로그램도 고르게 보이도록)
      const major = !!audienceOf(r.p);
      if (major && majorOnly >= 2) continue;
      if (major) majorOnly++;
      const nm = familyName(r.p.t);
      if (seen.has(nm)) continue;
      seen.add(nm);
      items.push({ r, sem: suggestSem(r.p, now + k, today) });
    }
    return { stage, items };
  });
}

/** 진로 진단으로 비교과 목표 추천 (학생이 고르지 않았을 때) */
export function suggestThemes(profile: Profile): ThemeId[] {
  const out: ThemeId[] = [];
  const has = (xs: readonly string[], re: RegExp) => xs.some((x) => re.test(x));
  if (has(profile.interests, /데이터|프로그래밍|보안/) || has(profile.jobs, /개발|데이터|AI|보안/)) out.push("ai");
  if (has(profile.interests, /언어|글로벌/) || has(profile.jobs, /무역|교육/)) out.push("english");
  if (has(profile.jobs, /창업/)) out.push("startup");
  out.push("career");
  return [...new Set(out)].slice(0, 2);
}

/** 캘린더 파일(.ics): 신청 마감일과 운영 기간 */
export function icsOf(items: { p: Program }[], today = todayISO(), stamp = new Date()): string {
  const d = (x: string) => x.replace(/-/g, "");
  const next = (x: string) => {
    const t = new Date(`${x}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 1);
    return t.toISOString().slice(0, 10).replace(/-/g, "");
  };
  const esc = (x: string) => x.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ts = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//track-compass//e-Advisor//KO", "CALSCALE:GREGORIAN", "X-WR-CALNAME:비교과 일정"];
  for (const { p } of items) {
    const url = `https://hsportal.hansung.ac.kr/ko/program/all/view/${p.id}`;
    const ev = (uid: string, from: string, to: string, title: string) =>
      lines.push("BEGIN:VEVENT", `UID:${uid}@track-compass`, `DTSTAMP:${ts}`, `DTSTART;VALUE=DATE:${d(from)}`, `DTEND;VALUE=DATE:${next(to)}`, `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(`${p.o} · ${p.p ? `${p.p}pt` : "포인트 공지 확인"} · ${url}`)}`, "END:VEVENT");
    if (p.ae >= today) ev(`${p.id}-apply`, p.ae, p.ae, `[신청 마감] ${cleanProgramName(p.t)}`);
    if (p.e >= today) ev(`${p.id}-run`, p.s >= today ? p.s : today, p.e, cleanProgramName(p.t));
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** 오늘 이후 일정 (신청 마감·운영 시작), 날짜순 */
export function upcomingOf(items: { p: Program }[], today = todayISO(), limitDays = 120): { date: string; kind: "마감" | "시작"; p: Program }[] {
  const end = new Date(Date.parse(today) + limitDays * 86400000).toISOString().slice(0, 10);
  const out: { date: string; kind: "마감" | "시작"; p: Program }[] = [];
  for (const { p } of items) {
    if (p.ae >= today && p.ae <= end) out.push({ date: p.ae, kind: "마감", p });
    if (p.s >= today && p.s <= end) out.push({ date: p.s, kind: "시작", p });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.p.id - b.p.id);
}

/**
 * 진로 진단 결과와 선택한 트랙으로 프로그램 점수를 매긴다.
 * - 비교과로 키우고 싶은 분야(카테고리) 일치 +12 (가장 먼저 추천)
 * - 관심 분야 일치 +3, 희망 직무 일치 +3 (각각 최대 2개까지), 강점 일치 +1
 * - 내 트랙 이름이 들어간 프로그램 +6, 내 트랙 소속 학부·학과가 운영 +3
 * - 다른 학부·학과 전용으로 보이는 전공 프로그램 -4
 * - 인재인증 프로그램 +0.5, 포인트가 높을수록 최대 +2
 */
export function scoreProgram(p: Program, profile: Profile, tracks: Track[] | null): Scored {
  const txt = textOf(p);
  const themes = themesOf(p);
  const reasons: string[] = [];
  let score = 0;

  const wanted = (profile.extraThemes ?? []).filter((t) => themes.includes(t as ThemeId));
  if (wanted.length) {
    score += 12 * wanted.length;
    reasons.push(`원하는 분야 '${wanted.map((w) => THEMES.find((t) => t.id === w)!.label).join("', '")}'`);
  }
  const hitI = profile.interests.filter((i) => INTEREST_KW[i]?.test(txt));
  if (hitI.length) {
    score += 3 * Math.min(2, hitI.length);
    reasons.push(`관심 '${hitI.join("', '")}'`);
  }
  const hitJ = profile.jobs.filter((j) => JOB_KW[j]?.test(txt));
  if (hitJ.length) {
    score += 3 * Math.min(2, hitJ.length);
    reasons.push(`직무 '${hitJ.join("', '")}'`);
  }
  const hitS = profile.strengths.filter((s) => STRENGTH_KW[s]?.test(txt));
  if (hitS.length) score += hitS.length;

  const audience = audienceOf(p);
  let eligible = true;
  const mine = tracks ?? [];
  const named = mine.filter((t) => p.t.includes(short(t)) || p.k.includes(short(t)) || p.t.includes(t.name));
  if (named.length) {
    score += 6;
    reasons.push(`내 트랙 '${named.map((t) => t.name).join("', '")}' 프로그램`);
  } else if (mine.some((t) => p.o.includes(t.school))) {
    score += 3;
    reasons.push(`${mine.find((t) => p.o.includes(t.school))!.school} 운영`);
  } else if (audience && audience !== profile.entry) {
    // 다른 학부·학과 학생 대상 전공 프로그램: 목표 로드맵에서 빼고 목록에서는 대상 표시
    eligible = false;
    score -= 6;
  }
  const years = yearsOf(p);
  if (years) {
    if (years.includes(profile.year)) {
      score += 1.5;
      reasons.push(`${years.join("·")}학년 추천`);
    } else score -= 2;
  }
  if (p.cert) score += 0.5;
  if (statusOf(p) === "open") score += 1.5;
  if (p.sems.length > 1) score += 0.5;
  score += Math.min(p.p, 100) / 50;
  return { p, score, reasons, themes, eligible, audience, years };
}

export function recommendPrograms(profile: Profile, tracks: Track[] | null, programs: Program[] = PROGRAMS): Scored[] {
  return programs
    .map((p) => scoreProgram(p, profile, tracks))
    .sort((a, b) => b.score - a.score || b.p.p - a.p.p || b.p.s.localeCompare(a.p.s));
}

export function themeCounts(list: Scored[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const s of list) for (const t of s.themes) c[t] = (c[t] ?? 0) + 1;
  return c;
}

export const findProgram = (id: number) => PROGRAMS.find((p) => p.id === id) ?? null;

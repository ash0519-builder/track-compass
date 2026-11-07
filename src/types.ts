export type CollegeKey = "HUM" | "SOC" | "DES" | "ENG" | "CON";
export type DayNight = "주간" | "야간";
/** 트랙 개설 형태: 주·야 모두, 주간만, 야간만 */
export type Offer = "주야" | "주간" | "야간";
/** 기=전공기초, 필=전공필수, 선=전공선택 */
export type Req = "기" | "필" | "선";

export interface Course {
  /** 원문 학기 표기 (예: "2-1", "1-1·2", "2-1계절", "전학년") */
  term: string;
  /** 로드맵에 배치할 학기 인덱스 0~7 (1-1 = 0) */
  sem: number;
  req: Req;
  name: string;
  credit: number;
  seasonal: boolean;
}

export interface Track {
  name: string;
  college: CollegeKey;
  /** 소속 학부 이름, 학과면 학과 이름 */
  school: string;
  kind: "트랙" | "학과";
  offer: Offer;
  /** 제2트랙으로만 선택 가능 (창업트랙) */
  secondOnly?: boolean;
  /** 제2트랙 선택 시 선발 (창의융합대학 학과: 주야별 모집인원 30% 이내) */
  selectiveSecond?: boolean;
  /** 컴퓨터공학부: 트랙기초 B0 이상 이수자만 선택 가능 (2023학번~) */
  prerequisite?: string;
  /** 2027학년도 학사조직 개편 후 명칭 */
  rename2027?: string;
  /** 공식 교육과정 페이지 */
  source: string;
  /** 이수구분이 공개되지 않은 경우 등 데이터 유의사항 */
  dataNote?: string;
  interests: string[];
  jobs: string[];
  strengths: string[];
  courses: Course[];
}

export interface EntryUnit {
  id: string;
  name: string;
  college: CollegeKey;
  /** 상상력인재학부: 1트랙을 거의 모든 트랙에서 선택 */
  free?: boolean;
  /** 학과 입학생: 1트랙은 본인 학과 */
  dept?: boolean;
  days: DayNight[];
}

export interface Profile {
  entry: string;
  day: DayNight;
  /** 입학년도(학번). 교양 졸업학점과 교양필수 과목이 학번마다 다르다 */
  admission?: number;
  year: number;
  sem: number;
  interests: string[];
  jobs: string[];
  strengths: string[];
  /** 비교과로 키우고 싶은 분야 (비교과 카테고리 id) */
  extraThemes?: string[];
}

export interface Combo {
  a: Track;
  b: Track;
  sa: number;
  sb: number;
  base: number;
  bonus: number;
  total: number;
}

export type ItemKind = "a" | "b" | "g" | "x" | "m";

export interface PlanItem {
  id: string;
  kind: ItemKind;
  name: string;
  /** 교과: 학점, 비교과: 포인트, 0이면 학점·포인트 없음 */
  unit: number;
  /** 보조 설명 (이수구분, 출처 기준 등) */
  sub: string;
  req?: Req;
  /** 포인트가 공개되지 않았거나 최대값인 경우 */
  unitLabel?: string;
  /** 스마트자기관리시스템 프로그램 번호 */
  programId?: number;
  /** 학생이 담지 않았고 앱이 추천해서 넣은 항목 */
  auto?: boolean;
  /** 지난 학기에 이수하지 못해 이번·다음 학기로 다시 넣은 항목 (원래 항목 id) */
  carryOf?: string;
  /** 학기 학점이 몰려 다른 학기로 옮긴 경우 원래 학기 인덱스 */
  movedFrom?: number;
}

export type Roadmap = PlanItem[][];

/**
 * 전공 이수 방식 (한성대 '전공교육과정 이수학점')
 * - fusion1 융합전공Ⅰ: 트랙·학과 2개 각 39학점
 * - fusion2 융합전공Ⅱ: 학과 57학점 + 부전공 21학점
 * - deep 심화전공: 학과 1개 78학점 (제2트랙 없음)
 * - undecided: 제2트랙을 아직 정하지 않음 (제1트랙만 먼저 계획)
 */
export type MajorMode = "fusion1" | "fusion2" | "deep" | "undecided";

/** 학생이 고른 전공 계획 */
export interface Plan {
  mode: MajorMode;
  a: Track;
  /** 제2트랙(융합전공Ⅰ) 또는 부전공(융합전공Ⅱ). 심화전공·미정이면 null */
  b: Track | null;
  /** 두 트랙 조합 점수 (제2트랙이 있을 때) */
  combo: Combo | null;
}

export interface AppState {
  profile: Profile;
  /** [제1트랙, 제2트랙·부전공]. 제2트랙이 없으면 두 번째는 null */
  pick: [string, string | null] | null;
  /** 전공 이수 방식 (없으면 융합전공Ⅰ) */
  mode?: MajorMode;
  checks: Record<string, true>;
  /** 로드맵에 담은 비교과 프로그램: 프로그램 id → 학기 인덱스(0~7) */
  extraPicks?: Record<string, number>;
  /** 스마트자기관리시스템에서 확인한 실제 누적 비교과포인트 (입력 시 우선) */
  myPoints: number | null;
  sample: boolean;
}

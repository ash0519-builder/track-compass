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
  year: number;
  sem: number;
  interests: string[];
  jobs: string[];
  strengths: string[];
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
}

export type Roadmap = PlanItem[][];

export interface AppState {
  profile: Profile;
  pick: [string, string] | null;
  checks: Record<string, true>;
  /** 스마트자기관리시스템에서 확인한 실제 누적 비교과포인트 (입력 시 우선) */
  myPoints: number | null;
  sample: boolean;
}

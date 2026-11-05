export type CollegeKey = "HUM" | "SOC" | "DES" | "ENG" | "CON";
export type Entry = "FREE" | CollegeKey;

export interface Track {
  name: string;
  col: CollegeKey;
  interests: string[];
  jobs: string[];
  strengths: string[];
  /** 기초 2과목, 핵심 2과목, 프로젝트 1과목 (예시 데이터) */
  courses: [string, string, string, string, string];
}

export interface Profile {
  entry: Entry;
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

export type ItemKind = "a" | "b" | "n" | "x";

export interface PlanItem {
  id: string;
  kind: ItemKind;
  name: string;
  /** 학점(교과) 또는 포인트(비교과). 0이면 점검 항목 */
  unit: number;
  sub: string;
}

export type Roadmap = PlanItem[][];

export interface AppState {
  profile: Profile;
  pick: [string, string] | null;
  checks: Record<string, true>;
  sample: boolean;
}

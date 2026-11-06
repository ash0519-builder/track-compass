import { EXTRA_PLAN, GRAD, IMAGINANCE_FREE_ALT, LIBERAL_REQUIRED } from "../data/rules";
import { findEntry } from "../data/tracks";
import { findProgram, type Scored } from "./programs";
import type { AppState, Combo, Course, ItemKind, PlanItem, Profile, Roadmap, Track } from "../types";

const REQ_LABEL = { 기: "전공기초", 필: "전공필수", 선: "전공선택" } as const;

export interface TrackPlan {
  items: { course: Course; sem: number; shared: boolean }[];
  credits: number;
  /** 공개된 교육과정만으로 39학점을 채우지 못함 */
  short: boolean;
}

/**
 * 한 트랙에서 졸업요건(트랙당 39학점)을 채우는 과목을 고른다.
 * 전공기초·전공필수는 모두 넣고, 전공선택은 학기별로 고르게 골라 39학점을 채운다.
 * 다른 트랙에서 이미 넣은 과목은 학점을 한 번만 인정하므로 0학점으로 표시하고 전공선택을 더 넣는다.
 */
export function planTrack(t: Track, taken: Set<string>, basicSem: number): TrackPlan {
  const items: TrackPlan["items"] = [];
  let credits = 0;
  const add = (course: Course, sem: number) => {
    const shared = taken.has(course.name);
    items.push({ course, sem, shared });
    if (!shared) credits += course.credit;
  };

  const basic = t.courses.find((c) => c.req === "기");
  if (basic) add(basic, basic.term.includes("·") ? basicSem : basic.sem);
  for (const c of t.courses.filter((c) => c.req === "필")) add(c, c.sem);

  // 전공선택: 2학년 이후 학기부터 학기마다 한 과목씩 돌아가며 고른다
  const pool = t.courses.filter((c) => c.req === "선" && !taken.has(c.name) && !items.some((i) => i.course.name === c.name));
  const order = [2, 3, 4, 5, 6, 7, 1, 0];
  const bySem = new Map(order.map((s) => [s, pool.filter((c) => c.sem === s)]));
  while (credits < GRAD.perTrack) {
    let picked = false;
    for (const s of order) {
      const list = bySem.get(s)!;
      const c = list.shift();
      if (!c) continue;
      add(c, c.sem);
      picked = true;
      if (credits >= GRAD.perTrack) break;
    }
    if (!picked) break;
  }
  return { items, credits, short: credits < GRAD.perTrack };
}

export interface ExtraOptions {
  /** 학생이 담은 프로그램: id → 학기 */
  picks?: Record<string, number>;
  /** 추천 순위 (빈 학기를 채울 때 사용) */
  recs?: Scored[];
  /** 지금 학기 인덱스. 이 학기부터 빈 학기에 추천 비교과를 채운다 */
  now?: number;
  /** 빈 학기마다 채울 추천 개수 */
  perSemester?: number;
}

export function buildRoadmap(c: Combo, p: Profile, opts: ExtraOptions = {}): Roadmap {
  const sems: PlanItem[][] = Array.from({ length: 8 }, () => []);
  const push = (sem: number, kind: ItemKind, name: string, unit: number, sub: string, extra: Partial<PlanItem> = {}) => {
    const s = Math.min(7, Math.max(0, sem));
    sems[s].push({ id: `s${s}:${kind}:${name}`, kind, name, unit, sub, ...extra });
  };

  // 교양 (24학번 이후 31학점: 교양필수 13 + 선택필수교양 15 + 자율 3)
  const free = findEntry(p.entry).free;
  for (const g of LIBERAL_REQUIRED) {
    const name = free && g.name === "한성 이마기난스" ? IMAGINANCE_FREE_ALT : g.name;
    push(g.sem, "g", name, g.credit, "교양필수");
  }
  [0, 1, 2, 3, 4].forEach((s, k) => push(s, "g", `선택필수교양 ${k + 1}`, 3, "배분이수 영역 4개 이상에서 선택"));
  push(5, "g", "자율 교양", 3, "교양 자율선택");

  // 제1트랙 → 제2트랙 순서로 과목 배치
  const taken = new Set<string>();
  const planA = planTrack(c.a, taken, 0);
  planA.items.forEach((i) => taken.add(i.course.name));
  const planB = planTrack(c.b, taken, 1);
  for (const [plan, kind, t] of [
    [planA, "a", c.a],
    [planB, "b", c.b],
  ] as const) {
    for (const { course, sem, shared } of plan.items) {
      const tags = [REQ_LABEL[course.req], course.seasonal ? "계절학기" : "", shared ? "다른 트랙과 같은 과목: 학점 1회 인정" : ""].filter(Boolean);
      push(sem, kind, course.name, shared ? 0 : course.credit, `${t.name} · ${tags.join(" · ")}`, { req: course.req, unitLabel: shared ? "중복" : undefined });
    }
  }

  // 트랙 선택 신청 (2학년 진학 전)
  push(1, "m", "제1·제2트랙 선택 신청", 0, "학사 공지 일정 확인 (종합정보시스템)", { unitLabel: "신청" });

  // 비교과: 학교 공통 일정
  for (const x of EXTRA_PLAN) push(x.sem, "x", x.name, x.pts, x.sub, { unitLabel: x.pts ? undefined : x.label });

  // 비교과: 학생이 담은 프로그램
  const picks = opts.picks ?? {};
  const used = new Set<number>();
  for (const [id, sem] of Object.entries(picks)) {
    const prog = findProgram(Number(id));
    if (!prog) continue;
    used.add(prog.id);
    push(sem, "x", prog.t, prog.p, `${prog.o} · ${prog.c2}`, { programId: prog.id, unitLabel: prog.p ? undefined : "공지 확인" });
  }

  // 비교과: 담은 프로그램이 없는 학기는 추천 상위 프로그램으로 채움
  if (opts.recs) {
    const per = opts.perSemester ?? 2;
    const from = Math.max(0, opts.now ?? 0);
    const pickedSems = new Set(Object.values(picks));
    const queue = opts.recs.filter((r) => !used.has(r.p.id) && r.p.p > 0 && r.score > 0);
    for (let s = from; s < 8; s++) {
      if (pickedSems.has(s)) continue;
      for (let k = 0; k < per && queue.length; k++) {
        const r = queue.shift()!;
        push(s, "x", r.p.t, r.p.p, `추천 · ${r.p.o} · ${r.p.c2}`, { programId: r.p.id, auto: true });
      }
    }
  }

  const order: Record<ItemKind, number> = { m: 0, a: 1, b: 2, g: 3, x: 4 };
  return sems.map((items) => items.sort((m, n) => order[m.kind] - order[n.kind]));
}

export const nowIndex = (p: Profile) => (p.year - 1) * 2 + (p.sem - 1);

export function unitText(it: PlanItem): string {
  if (it.unitLabel && !it.unit) return it.unitLabel;
  return it.kind === "x" ? `${it.unit}pt` : `${it.unit}학점`;
}

export interface Progress {
  a: number;
  b: number;
  liberal: number;
  /** 로드맵에서 체크한 비교과 포인트 */
  plannedPts: number;
  /** 대시보드에 보여줄 포인트 (직접 입력값 우선) */
  extraPts: number;
}

export function progress(rm: Roadmap, checks: AppState["checks"], myPoints: number | null = null): Progress {
  const r: Progress = { a: 0, b: 0, liberal: 0, plannedPts: 0, extraPts: 0 };
  for (const it of rm.flat()) {
    if (!checks[it.id]) continue;
    if (it.kind === "a") r.a += it.unit;
    if (it.kind === "b") r.b += it.unit;
    if (it.kind === "g") r.liberal += it.unit;
    if (it.kind === "x") r.plannedPts += it.unit;
  }
  r.extraPts = myPoints ?? r.plannedPts;
  return r;
}

/** 현재 학기 이전 항목을 모두 완료로 표시한 체크 상태 */
export function checksBefore(rm: Roadmap, now: number): AppState["checks"] {
  const checks: AppState["checks"] = {};
  rm.forEach((sem, k) => {
    if (k < now) sem.forEach((it) => (checks[it.id] = true));
  });
  return checks;
}

export function trackCredits(rm: Roadmap, kind: "a" | "b"): number {
  return rm.flat().filter((it) => it.kind === kind).reduce((s, it) => s + it.unit, 0);
}

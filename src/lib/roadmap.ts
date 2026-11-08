import { CURRENT_YEAR, EXTRA_PLAN, GRAD, IMAGINANCE_FREE_ALT, LIBERAL_AREAS, LIBERAL_REQUIRED, liberalTotal, MODE_RULES, type MajorSpec } from "../data/rules";
import { findEntry, SEM_NAMES } from "../data/tracks";
import { cleanProgramName, familyName, findProgram, type Scored } from "./programs";
import { moduleOf, modulePath, pathCourses } from "../data/modules";
import type { AppState, Course, Edits, ItemKind, Plan, PlanItem, Profile, Roadmap, TakenCourse, Track } from "../types";
import { lookupCourse, passed } from "./learning";
import { planParts } from "./plan";
import { normName } from "./text";

const REQ_LABEL = { 기: "전공기초", 필: "전공필수", 선: "전공선택" } as const;

export interface TrackPlan {
  items: { course: Course; sem: number; shared: boolean }[];
  credits: number;
  /** 고른 전공필수 학점 */
  reqCredits: number;
  /** 공개된 교육과정만으로 목표 학점을 채우지 못함 */
  short: boolean;
  /** 공개된 교육과정의 전공필수가 최소 학점보다 적음 */
  reqShort: boolean;
}

const TRACK_SPEC: MajorSpec = MODE_RULES.fusion1.a;

/**
 * 한 전공에서 졸업요건 학점(spec.total, 융합전공Ⅰ은 39학점)을 채우는 과목을 고른다.
 * 전공기초·전공필수는 모두 넣고(부전공은 전공필수를 spec.req학점만), 전공선택은 학기별로 고르게 골라 채운다.
 * 다른 트랙에서 이미 넣은 과목은 학점을 한 번만 인정하므로 0학점으로 표시하고 전공선택을 더 넣는다.
 */
export interface TrackPick {
  /** 먼저 넣을 전공선택 (정규화한 과목명), 앞 묶음부터: 이미 들은 과목 → 진로 모듈 과목 */
  prefer?: Set<string>[];
  /** 학생이 직접 넣은 전공선택 (학점이 넘어도 넣음) */
  pins?: Set<string>;
  /** 학생이 뺀 전공선택 */
  drops?: Set<string>;
  /** 다른 전공의 전공기초·전공필수라 여기서는 전공선택으로 고르지 않을 과목 (이미 들었거나 직접 넣은 것은 예외) */
  avoid?: Set<string>;
}

export function planTrack(t: Track, taken: Set<string>, basicSem: number, spec: MajorSpec = TRACK_SPEC, pick: TrackPick = {}): TrackPlan {
  const items: TrackPlan["items"] = [];
  let credits = 0;
  let reqCredits = 0;
  const add = (course: Course, sem: number) => {
    const shared = taken.has(course.name);
    items.push({ course, sem, shared });
    if (!shared) credits += course.credit;
    // 다른 전공과 겹친 과목은 학점을 한 번만 인정하므로 전공필수 학점에도 넣지 않는다
    if (course.req === "필" && !shared) reqCredits += course.credit;
  };

  const basic = t.courses.find((c) => c.req === "기");
  if (basic) add(basic, basic.term.includes("·") ? basicSem : basic.sem);
  for (const c of t.courses.filter((c) => c.req === "필")) {
    if (spec.partialReq && reqCredits >= spec.req) break;
    add(c, c.sem);
  }

  // 전공선택: 학생이 넣은 과목 → 이미 들은 과목·진로 모듈 과목 → 2학년 이후 학기부터 학기마다 한 과목씩 돌아가며
  let pool = t.courses.filter(
    (c) => c.req === "선" && !taken.has(c.name) && !items.some((i) => i.course.name === c.name) && !pick.drops?.has(normName(c.name)),
  );
  const take = (c: Course) => {
    add(c, c.sem);
    pool = pool.filter((x) => x !== c);
  };
  for (const c of pool.filter((c) => pick.pins?.has(normName(c.name)))) take(c);
  for (const [k, set] of (pick.prefer ?? []).entries())
    for (const c of pool.filter((c) => set.has(normName(c.name)) && (k === 0 || !pick.avoid?.has(normName(c.name))))) {
      if (credits >= spec.total) break;
      take(c);
    }
  pool = pool.filter((c) => !pick.avoid?.has(normName(c.name)));
  const order = [2, 3, 4, 5, 6, 7, 1, 0];
  const bySem = new Map(order.map((s) => [s, pool.filter((c) => c.sem === s)]));
  while (credits < spec.total) {
    let picked = false;
    for (const s of order) {
      const list = bySem.get(s)!;
      const c = list.shift();
      if (!c) continue;
      add(c, c.sem);
      picked = true;
      if (credits >= spec.total) break;
    }
    if (!picked) break;
  }
  return { items, credits, reqCredits, short: credits < spec.total, reqShort: reqCredits < spec.req };
}

export interface ExtraOptions {
  /** 학생이 담은 프로그램: id → 학기 */
  picks?: Record<string, number>;
  /** 추천 순위 (빈 학기를 채울 때 사용) */
  recs?: Scored[];
  /** 지금 학기 인덱스 */
  now?: number;
  /** 빈 학기마다 채울 추천 개수 */
  perSemester?: number;
  /** 체크 상태. 주면 지난 학기 미이수 필수 과목을 이번·다음 학기로 다시 넣는다 */
  checks?: AppState["checks"];
  /** 학생이 직접 수정한 내용 */
  edits?: Edits;
  /** 모듈형 트랙 진로 경로 선택 */
  paths?: Record<string, string>;
}

export const admissionOf = (p: Profile) => p.admission ?? CURRENT_YEAR - (p.year - 1);

/** 학번별 교양 계획. 24학번 이후는 교양필수 과목명, 그 이전은 학점 묶음으로 표시 */
function liberalItems(p: Profile): { sem: number; name: string; credit: number; sub: string }[] {
  const adm = admissionOf(p);
  const free = findEntry(p.entry).free;
  if (adm >= 2024) {
    const req = LIBERAL_REQUIRED.map((g) => ({
      sem: g.sem,
      name: free && adm >= 2025 && g.name === "한성 이마기난스" ? IMAGINANCE_FREE_ALT : g.name,
      credit: g.credit,
      sub: "교양필수",
    }));
    const dist = LIBERAL_AREAS.map((a, k) => ({ sem: k, name: `선택필수교양(${a.name})`, credit: 3, sub: `선택필수교양 · ${a.hint} · 4개 영역 이상, 15학점` }));
    return [...req, ...dist, { sem: 5, name: "자율 교양", credit: 3, sub: "교양 자율선택" }];
  }
  // 23학번 이전: 교양필수 과목이 학번마다 달라 학점 묶음으로만 계획
  const total = liberalTotal(adm);
  const per = [0, 1, 2, 3].map((k) => Math.floor(total / 4) + (k < total % 4 ? 1 : 0));
  return per.map((credit, k) => ({ sem: k, name: `교양 ${k + 1} (${credit}학점)`, credit, sub: `${adm}학번 교양필수·선택 (학업이수가이드 확인)` }));
}

const CREDIT_KINDS: ItemKind[] = ["a", "b", "g", "f"];

/** 한 학기의 교과 학점 합계 */
export const semesterCredits = (items: PlanItem[]) => items.reduce((s, it) => s + (CREDIT_KINDS.includes(it.kind) ? it.unit : 0), 0);

/** 학기를 옮겨도 되는 항목의 우선순위 (낮을수록 먼저 옮김, -1은 옮기지 않음) */
function movePriority(it: PlanItem): number {
  if (it.carryOf || it.unit === 0) return -1;
  if (it.kind === "g") return it.sub === "교양필수" ? -1 : 0;
  if (it.kind === "b" || it.kind === "a") {
    const second = it.kind === "b" ? 0 : 1;
    if (it.req === "선") return 1 + second;
    if (it.req === "필") return 3 + second;
  }
  return -1;
}

/**
 * 옮길 수 있는 학기를 선호 순서대로 묶어 돌려준다.
 * 교양(선택)은 아무 학기, 전공은 같은 학기(1·2학기)에 열리는 이후 학기, 전공선택만 마지막으로 1년 앞 학기.
 */
function moveTargetGroups(it: PlanItem, s: number, from: number): number[][] {
  const all = [0, 1, 2, 3, 4, 5, 6, 7].filter((t) => t >= from && t !== s);
  if (it.kind === "g") return [all];
  const later = all.filter((t) => t > s && t % 2 === s % 2);
  const earlier = it.req === "선" && s - 2 >= Math.max(2, from) ? [s - 2] : [];
  return [later, earlier];
}

/**
 * 학기당 최대 수강 학점(cap)을 넘는 학기에서 옮길 수 있는 과목을 가장 가벼운 학기로 옮긴다.
 * 교양(선택) → 제2트랙 전공선택 → 제1트랙 전공선택 → 전공필수 순서로 옮기고, 전공기초·교양필수는 그대로 둔다.
 * 바로 옮길 학기가 없으면 그 학기의 교양(선택) 하나를 다른 학기로 먼저 비켜 자리를 만든다.
 */
function rebalance(sems: PlanItem[][], from: number, cap: number, locked: (it: PlanItem) => boolean = () => false) {
  const movable = (it: PlanItem) => (locked(it) ? -1 : movePriority(it));
  const move = (it: PlanItem, s: number, t: number) => {
    sems[s].splice(sems[s].indexOf(it), 1);
    sems[t].push({ ...it, movedFrom: it.movedFrom ?? s });
  };
  for (let guard = 0; guard < 160; guard++) {
    const loads = sems.map(semesterCredits);
    const over = sems.map((_, s) => s).filter((s) => s >= from && loads[s] > cap).sort((x, y) => loads[y] - loads[x] || x - y);
    let moved = false;
    outer: for (const s of over) {
      const cands = sems[s]
        .map((it) => ({ it, pr: movable(it) }))
        .filter((x) => x.pr >= 0)
        .sort((x, y) => x.pr - y.pr);
      for (const { it } of cands) {
        const groups = moveTargetGroups(it, s, from).map((g) => [...g].sort((x, y) => loads[x] - loads[y] || Math.abs(x - s) - Math.abs(y - s) || y - x));
        // 1) 바로 들어갈 학기
        for (const g of groups) {
          const t = g.find((t) => loads[t] + it.unit <= cap);
          if (t !== undefined) {
            move(it, s, t);
            moved = true;
            break outer;
          }
        }
        // 2) 교양(선택) 하나를 비켜서 자리 만들기
        for (const g of groups) {
          for (const t of g) {
            for (const lib of sems[t].filter((x) => x !== it && movable(x) === 0)) {
              if (loads[t] - lib.unit + it.unit > cap) continue;
              const u = [0, 1, 2, 3, 4, 5, 6, 7]
                .filter((u) => u >= from && u !== s && u !== t && loads[u] + lib.unit <= cap)
                .sort((x, y) => loads[x] - loads[y] || Math.abs(x - t) - Math.abs(y - t))[0];
              if (u === undefined) continue;
              move(lib, t, u);
              move(it, s, t);
              moved = true;
              break outer;
            }
          }
        }
      }
    }
    if (!moved) return;
  }
}

/** 예전 버전(학기 번호가 들어간 id)의 체크 상태를 지금 id로 바꾼다 */
export function normalizeChecks(checks: AppState["checks"] | undefined): AppState["checks"] {
  const out: AppState["checks"] = {};
  for (const [k, v] of Object.entries(checks ?? {})) {
    if (!v) continue;
    const block = /^s(\d+):g:교양 (\d+)학점$/.exec(k);
    let key = block ? `g:교양 ${Number(block[1]) + 1} (${block[2]}학점)` : k.replace(/^(carry:)?s\d+:/, "$1");
    const dist = /^(carry:)?g:선택필수교양 (\d)$/.exec(key);
    if (dist && LIBERAL_AREAS[Number(dist[2]) - 1]) key = `${dist[1] ?? ""}g:선택필수교양(${LIBERAL_AREAS[Number(dist[2]) - 1].name})`;
    out[key] = true;
  }
  return out;
}

const KIND_LABEL: Record<"a" | "b" | "g" | "f", string> = { a: "1트랙", b: "2트랙", g: "교양", f: "자유선택(일반선택)" };

/** 학생이 직접 고친 내용 반영: 교양 자리 과목명 → 학기 옮기기 → 과목 추가 */
function applyEdits(sems: PlanItem[][], edits: Edits, plan: Plan) {
  const renames = edits.renames ?? {};
  for (const items of sems)
    for (const it of items) {
      const nm = renames[it.id]?.trim();
      if (it.kind === "g" && nm && !it.carryOf) {
        it.sub = `${it.name} 자리 · ${it.sub}`;
        it.name = nm;
      }
    }
  for (const [id, to] of Object.entries(edits.moves ?? {})) {
    const from = sems.findIndex((items) => items.some((it) => it.id === id));
    const t = Math.min(7, Math.max(0, Math.round(to)));
    if (from < 0 || from === t) continue;
    const it = sems[from].find((x) => x.id === id)!;
    sems[from] = sems[from].filter((x) => x !== it);
    const parityNote = (it.kind === "a" || it.kind === "b") && from % 2 !== t % 2 ? " · 개설 학기(1·2학기) 확인" : "";
    sems[t].push({ ...it, manual: "moved", sub: `${it.sub} · 직접 옮김(${SEM_NAMES[from]}에서)${parityNote}` });
  }
  for (const c of edits.custom ?? []) {
    const t = Math.min(7, Math.max(0, Math.round(c.sem)));
    const track = c.kind === "a" ? plan.a.name : c.kind === "b" ? plan.b?.name : null;
    sems[t].push({
      id: c.id,
      kind: c.kind,
      name: c.name,
      unit: c.credit,
      sub: `${track ? `${track} · ` : ""}${KIND_LABEL[c.kind]} · 직접 추가`,
      manual: "custom",
    });
  }
}

export function buildRoadmap(plan: Plan, p: Profile, opts: ExtraOptions = {}): Roadmap {
  const sems: PlanItem[][] = Array.from({ length: 8 }, () => []);
  const ids = new Set<string>();
  const push = (sem: number, kind: ItemKind, name: string, unit: number, sub: string, extra: Partial<PlanItem> = {}) => {
    const s = Math.min(7, Math.max(0, sem));
    const base = extra.carryOf ? `carry:${extra.carryOf}` : `${kind}:${name}`;
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}#${n}`;
    ids.add(id);
    sems[s].push({ id, kind, name, unit, sub, ...extra });
  };
  const now = Math.max(0, opts.now ?? 0);
  const { semesterMax: CAP, semesterMaxCarry: CAP_CARRY } = GRAD;

  // 교양
  for (const g of liberalItems(p)) push(g.sem, "g", g.name, g.credit, g.sub);

  // 제1트랙(학과) → 제2트랙(부전공) 순서로 과목 배치
  const placed = new Set<string>();
  const done = new Set((p.taken ?? []).filter((c) => passed(c.grade)).map((c) => normName(c.name)));
  const edits = opts.edits ?? {};
  const keysOf = (list: string[] | undefined, kind: string) =>
    new Set((list ?? []).filter((k) => k.startsWith(`${kind}:`)).map((k) => normName(k.slice(kind.length + 1))));
  const parts = planParts(plan);
  const firstNames = new Map<string, PlanItem>();
  for (const part of parts) {
    const t = part.t;
    const path = modulePath(t.name, p.jobs, opts.paths?.[t.name]);
    // 다른 전공의 기초·필수 과목은 여기서 전공선택으로 먼저 가져가지 않는다 (같은 과목은 학점 1회 인정이라 손해)
    const others = parts.filter((x) => x !== part).flatMap((x) => x.t.courses.filter((c) => c.req !== "선").map((c) => normName(c.name)));
    const tp = planTrack(t, placed, part.kind === "a" ? 0 : 1, part.spec, {
      prefer: [done, pathCourses(t.name, path)],
      pins: keysOf(edits.pins, part.kind),
      drops: keysOf(edits.drops, part.kind),
      avoid: new Set(others),
    });
    tp.items.forEach((i) => placed.add(i.course.name));
    for (const { course, sem, shared } of tp.items) {
      // 앞 전공과 같은 과목은 한 번만 보여 주고, 앞 항목에 두 전공 공통이라고 적는다
      const same = shared ? firstNames.get(course.name) : undefined;
      if (same) {
        same.sub += ` · ${t.name} ${REQ_LABEL[course.req]}과 같은 과목(학점 1회 인정)`;
        continue;
      }
      const module = moduleOf(t.name, course.name) ?? undefined;
      const tags = [
        part.spec.label === "부전공" ? `부전공 ${REQ_LABEL[course.req]}` : REQ_LABEL[course.req],
        module ?? "",
        course.req === "기" && t.prerequisite ? "트랙 선택 조건: 성취 기준(B0 이상) 충족" : "",
        course.seasonal ? "계절학기" : "",
        shared ? "다른 트랙과 같은 과목: 학점 1회 인정" : "",
      ].filter(Boolean);
      push(sem, part.kind, course.name, shared ? 0 : course.credit, `${t.name} · ${tags.join(" · ")}`, {
        req: course.req,
        unitLabel: shared ? "중복" : undefined,
        module,
      });
      const row = sems[Math.min(7, Math.max(0, sem))];
      const last = row[row.length - 1];
      if (part.kind === "a") firstNames.set(course.name, last);
    }
  }

  // 전공 선택 신청 (2학년 진학 전)
  if (plan.mode === "undecided") {
    push(Math.max(1, now), "m", "제2트랙 정하기", 0, findEntry(p.entry).dept || plan.a.kind === "학과"
      ? "제2트랙(융합전공Ⅰ)·부전공(융합전공Ⅱ)·심화전공 중 선택 · 정하면 로드맵에 들어가요"
      : "트랙제 입학생은 2학년 진학 시 제2트랙 선택 필수 · 정하면 39학점이 로드맵에 들어가요", { unitLabel: "결정" });
  } else if (plan.mode === "fusion2") {
    push(1, "m", "학과 전공·부전공 신청", 0, "부전공은 학사 공지 신청 일정 확인 (종합정보시스템)", { unitLabel: "신청" });
  } else if (plan.mode === "deep") {
    push(1, "m", "심화전공(제2트랙 없음) 확인", 0, "학과 소속 학생 · 학사운영팀·학과 사무실에 이수 방식 확인", { unitLabel: "확인" });
  } else {
    push(1, "m", "제1·제2트랙 선택 신청", 0, "학사 공지 일정 확인 (종합정보시스템)", { unitLabel: "신청" });
  }

  // 학기당 최대 수강 학점을 넘지 않게 고르게 나눈다 (학생 체크와 무관하게 항상 같은 결과)
  rebalance(sems, 0, CAP);

  // 지난 학기 미이수 전공기초·전공필수·교양필수 → 같은 학기(1학기/2학기)에 열리는 다음 학기로 다시 배치
  // 학생이 지난 학기 항목을 하나도 체크하지 않았다면 아직 확인 전으로 보고 다시 넣지 않는다
  const reviewed = !!opts.checks && now > 0 && sems.slice(0, now).some((items) => items.some((it) => opts.checks![it.id]));
  if (opts.checks && reviewed) {
    for (let s = 0; s < now; s++) {
      for (const it of [...sems[s]]) {
        const required = ((it.kind === "a" || it.kind === "b") && (it.req === "기" || it.req === "필")) || (it.kind === "g" && it.sub === "교양필수");
        if (!required || it.unit === 0 || opts.checks[it.id]) continue;
        // 같은 학기(1·2학기)에 열리는 남은 학기 중 학점 여유가 있는 가장 이른 학기
        const cands = [0, 1, 2, 3, 4, 5, 6, 7].filter((t) => t >= now && (it.kind === "g" || t % 2 === s % 2));
        const load = (t: number) => semesterCredits(sems[t]);
        const target =
          cands.find((t) => load(t) + it.unit <= CAP) ??
          cands.find((t) => load(t) + it.unit <= CAP_CARRY) ??
          [...cands].sort((x, y) => load(x) - load(y) || x - y)[0];
        const late = target === undefined;
        const t = late ? 7 : target;
        const notes = [
          late ? "개설 학기 확인 필요(계절·재수강)" : "",
          !late && load(t) + it.unit > CAP_CARRY ? `학기 ${CAP_CARRY}학점 초과: 계절학기·초과학기 검토` : "",
        ].filter(Boolean);
        push(t, it.kind, it.name, it.unit, [`지난 ${SEM_NAMES[s]} 미이수`, it.sub, ...notes].join(" · "), {
          req: it.req,
          carryOf: it.id,
        });
      }
    }
  }

  // 다시 넣은 과목 때문에 많아진 남은 학기는 아직 체크하지 않은 과목을 옮겨 다시 나눈다
  if (opts.checks && reviewed) rebalance(sems, now, CAP, (it) => !!opts.checks![it.id]);

  // 옮긴 전공 과목에는 원래 학기를 적어 둔다
  for (const items of sems)
    for (const it of items)
      if (it.movedFrom !== undefined && (it.kind === "a" || it.kind === "b")) it.sub += ` · 학점 분산 배치(교육과정상 ${SEM_NAMES[it.movedFrom]})`;

  applyEdits(sems, edits, plan);

  // 비교과: 학교 공통 일정
  for (const x of EXTRA_PLAN) push(x.sem, "x", x.name, x.pts, x.sub, { unitLabel: x.pts ? undefined : x.label });

  // 비교과: 학생이 담은 프로그램
  const picks = opts.picks ?? {};
  const used = new Set<number>();
  // 같은 이름으로 학기마다 따로 열리는 프로그램(예: 현장실습)은 추천에서 한 번만 넣는다
  const usedNames = new Set<string>();
  for (const [id, sem] of Object.entries(picks)) {
    const prog = findProgram(Number(id));
    if (!prog) continue;
    used.add(prog.id);
    usedNames.add(familyName(prog.t));
    push(sem, "x", prog.t, prog.p, `${prog.o} · ${prog.c2}`, { programId: prog.id, unitLabel: prog.p ? undefined : "공지 확인" });
  }

  // 비교과: 담은 프로그램이 없는 이번 학기 이후 학기는 추천 상위 프로그램으로 채움
  if (opts.recs) {
    const per = opts.perSemester ?? 2;
    const pickedSems = new Set(Object.values(picks));
    const queue = opts.recs.filter((r) => !used.has(r.p.id) && r.p.p > 0 && r.score > 0);
    const next = () => {
      while (queue.length) {
        const r = queue.shift()!;
        const nm = familyName(r.p.t);
        if (usedNames.has(nm) || !r.eligible) continue;
        usedNames.add(nm);
        return r;
      }
      return undefined;
    };
    for (let s = now; s < 8; s++) {
      if (pickedSems.has(s)) continue;
      for (let k = 0; k < per; k++) {
        const r = next();
        if (!r) break;
        const last = r.p.sems[r.p.sems.length - 1];
        push(s, "x", cleanProgramName(r.p.t), r.p.p, `추천 · ${r.p.o} · ${r.p.c2} · 최근 ${last}학기 운영 · 일정 공지 확인`, { programId: r.p.id, auto: true });
      }
    }
  }

  const order: Record<ItemKind, number> = { m: 0, a: 1, b: 2, g: 3, f: 4, x: 5 };
  return sems.map((items) => items.sort((m, n) => order[m.kind] - order[n.kind] || Number(!!m.carryOf) - Number(!!n.carryOf)));
}

export const nowIndex = (p: Profile) => Math.min(7, Math.max(0, (p.year - 1) * 2 + (p.sem - 1)));

export function unitText(it: PlanItem): string {
  if (it.unitLabel && !it.unit) return it.unitLabel;
  return it.kind === "x" ? `${it.unit}pt` : `${it.unit}학점`;
}

export interface Progress {
  a: number;
  b: number;
  liberal: number;
  /** 자유선택(직접 추가한 일반선택 과목) */
  free: number;
  /** 로드맵에서 체크한 비교과 포인트 */
  plannedPts: number;
  /** 대시보드에 보여줄 포인트 (직접 입력값 우선) */
  extraPts: number;
}

export function progress(rm: Roadmap, checks: AppState["checks"], myPoints: number | null = null): Progress {
  const r: Progress = { a: 0, b: 0, liberal: 0, free: 0, plannedPts: 0, extraPts: 0 };
  for (const it of rm.flat()) {
    if (!checks[it.id]) continue;
    if (it.kind === "a") r.a += it.unit;
    if (it.kind === "b") r.b += it.unit;
    if (it.kind === "g") r.liberal += it.unit;
    if (it.kind === "f") r.free += it.unit;
    if (it.kind === "x") r.plannedPts += it.unit;
  }
  r.extraPts = myPoints ?? r.plannedPts;
  return r;
}

/** 현재 학기 이전 항목을 모두 완료로 표시한 체크 상태 (다시 넣은 항목 제외) */
export function checksBefore(rm: Roadmap, now: number, base: AppState["checks"] = {}): AppState["checks"] {
  const checks: AppState["checks"] = { ...base };
  rm.forEach((sem, k) => {
    if (k < now) sem.forEach((it) => !it.carryOf && (checks[it.id] = true));
  });
  return checks;
}

/** 계획한 트랙 학점 (다시 넣은 항목은 원래 항목과 같은 과목이라 제외) */
export function trackCredits(rm: Roadmap, kind: "a" | "b"): number {
  return rm
    .flat()
    .filter((it) => it.kind === kind && !it.carryOf)
    .reduce((s, it) => s + it.unit, 0);
}

/** 지난 학기 항목을 하나라도 체크했는지 (체크를 시작해야 미이수 과목을 다시 넣는다) */
export function pastReviewed(rm: Roadmap, now: number, checks: AppState["checks"]): boolean {
  return rm.slice(0, now).some((items) => items.some((it) => !it.carryOf && checks[it.id]));
}

/** 지난 학기에서 체크하지 않은 항목 수 */
export function pastUnchecked(rm: Roadmap, now: number, checks: AppState["checks"]): number {
  return rm.slice(0, now).flat().filter((it) => !it.carryOf && it.kind !== "x" && it.kind !== "m" && !checks[it.id]).length;
}

/**
 * 학습 데이터(성적)로 이수 처리할 항목: 로드맵 과목명과 이수(F·NP 아님)한 과목명이 같으면 체크.
 * 학생이 해제한 항목(offs)은 빼고, 다시 넣은 과목(carry)은 건드리지 않는다.
 */
export function transcriptChecks(rm: Roadmap, taken: readonly TakenCourse[] | undefined, offs: AppState["offs"] = {}): AppState["checks"] {
  const out: AppState["checks"] = {};
  if (!taken?.length) return out;
  const done = new Set(taken.filter((c) => passed(c.grade)).map((c) => normName(c.name)));
  for (const it of rm.flat())
    if (CREDIT_KINDS.includes(it.kind) && !it.carryOf && !offs[it.id] && done.has(normName(it.name))) out[it.id] = true;
  return out;
}

/** 로드맵 밖에서 이수한 과목 학점 (교양필수 제외) → 자유선택으로 인정 */
export function outsideCredits(rm: Roadmap, taken: readonly TakenCourse[] | undefined): { name: string; credit: number }[] {
  if (!taken?.length) return [];
  const inPlan = new Set(rm.flat().filter((it) => CREDIT_KINDS.includes(it.kind)).map((it) => normName(it.name)));
  return taken
    .filter((c) => passed(c.grade) && !inPlan.has(normName(c.name)) && !lookupCourse(c.name)?.liberal)
    .map((c) => ({ name: c.name, credit: c.credit ?? lookupCourse(c.name)?.offers[0]?.credit ?? 3 }));
}

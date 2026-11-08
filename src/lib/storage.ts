import { ENTRIES, TAG_LIMITS } from "../data/tracks";
import { ADMISSION_YEARS } from "../data/rules";
import type { AppState, CustomItem, DayNight, Edits, Grade, TakenCourse } from "../types";
import { GRADES } from "./learning";
import { isMode } from "./plan";
import { normalizeChecks } from "./roadmap";

const KEY = "track-compass-v2";

const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : []);
const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function sanitizeTaken(v: unknown): TakenCourse[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: TakenCourse[] = [];
  for (const x of v.slice(0, 120)) {
    const name = str((x as TakenCourse)?.name, 60);
    const grade = (x as TakenCourse)?.grade;
    if (name.length < 2 || !GRADES.includes(grade as Grade)) continue;
    const c = Number((x as TakenCourse).credit);
    out.push({ name, grade: grade as Grade, ...(c >= 0.5 && c <= 6 ? { credit: c } : {}) });
  }
  return out;
}

function sanitizeEdits(v: unknown): Edits {
  const e = (v ?? {}) as Edits;
  const moves: Record<string, number> = {};
  for (const [k, n] of Object.entries(e.moves ?? {})) if (typeof n === "number" && n >= 0 && n <= 7) moves[str(k, 120)] = Math.round(n);
  const list = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === "string").map((y) => y.slice(0, 120)).slice(0, 80) : []);
  const renames: Record<string, string> = {};
  for (const [k, n] of Object.entries(e.renames ?? {})) if (str(n, 40)) renames[str(k, 120)] = str(n, 40);
  const custom: CustomItem[] = [];
  for (const c of Array.isArray(e.custom) ? e.custom.slice(0, 60) : []) {
    const name = str(c?.name, 40);
    if (name.length < 2 || !["a", "b", "g", "f"].includes(c?.kind)) continue;
    custom.push({ id: str(c.id, 40) || `c:${custom.length}`, sem: clamp(c.sem, 0, 7, 0), name, credit: clamp(c.credit, 1, 4, 3), kind: c.kind });
  }
  return { moves, drops: list(e.drops), pins: list(e.pins), renames, custom };
}

const strMap = (v: unknown, max: number) => {
  const out: Record<string, string> = {};
  for (const [k, n] of Object.entries((v ?? {}) as Record<string, unknown>).slice(0, 40)) if (typeof n === "string") out[str(k, 60)] = n.slice(0, max);
  return out;
};
const trueMap = (v: unknown) => {
  const out: Record<string, true> = {};
  for (const [k, n] of Object.entries((v ?? {}) as Record<string, unknown>).slice(0, 400)) if (n === true) out[k.slice(0, 120)] = true;
  return out;
};

/** 저장소·파일에서 읽은 값을 앱에서 쓸 수 있는 상태로 다듬는다. 쓸 수 없으면 null */
export function sanitizeState(raw: unknown): AppState | null {
  const s = raw as Partial<AppState> | null;
  const p = s?.profile;
  if (!p || typeof p !== "object" || typeof p.day !== "string") return null;
  const entry = ENTRIES.find((e) => e.id === p.entry);
  if (!entry) return null;
  const day: DayNight = entry.days.includes(p.day as DayNight) ? (p.day as DayNight) : entry.days[0];
  const year = clamp(p.year, 1, 4, 1);
  const admission = typeof p.admission === "number" && ADMISSION_YEARS.includes(p.admission) ? p.admission : undefined;
  const picks: Record<string, number> = {};
  for (const [k, v] of Object.entries(s?.extraPicks ?? {})) if (typeof v === "number") picks[k] = clamp(v, 0, 7, 0);
  const pick =
    Array.isArray(s?.pick) && s.pick.length === 2 && typeof s.pick[0] === "string" && (typeof s.pick[1] === "string" || s.pick[1] === null)
      ? ([s.pick[0], s.pick[1]] as [string, string | null])
      : null;
  const myPoints = typeof s?.myPoints === "number" && Number.isFinite(s.myPoints) ? Math.max(0, Math.round(s.myPoints)) : null;
  return {
    profile: {
      entry: entry.id,
      day,
      admission,
      year,
      sem: clamp(p.sem, 1, 2, 1),
      interests: strings(p.interests, TAG_LIMITS.interests),
      jobs: strings(p.jobs, TAG_LIMITS.jobs),
      strengths: strings(p.strengths, TAG_LIMITS.strengths),
      extraThemes: strings(p.extraThemes, 3),
      taken: sanitizeTaken(p.taken),
    },
    pick,
    mode: isMode(s?.mode) ? s.mode : "fusion1",
    edits: sanitizeEdits(s?.edits),
    paths: strMap(s?.paths, 40),
    offs: trueMap(s?.offs),
    checks: normalizeChecks(s?.checks),
    extraPicks: picks,
    myPoints,
    sample: s?.sample === true,
  };
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitizeState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 저장소를 쓸 수 없으면 메모리에만 유지
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

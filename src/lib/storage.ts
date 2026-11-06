import { ENTRIES, TAG_LIMITS } from "../data/tracks";
import { ADMISSION_YEARS } from "../data/rules";
import type { AppState, DayNight } from "../types";
import { normalizeChecks } from "./roadmap";

const KEY = "track-compass-v2";

const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : []);
const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);

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
  const pick = Array.isArray(s?.pick) && s.pick.length === 2 && s.pick.every((x) => typeof x === "string") ? (s.pick as [string, string]) : null;
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
    },
    pick,
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

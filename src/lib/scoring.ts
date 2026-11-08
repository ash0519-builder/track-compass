import { findEntry, TRACKS } from "../data/tracks";
import type { Combo, Profile, Track } from "../types";
import { hasLearning, learnFit, learnReason } from "./learning";

/** 가중치: 관심 분야 50%, 희망 직무 30%, 강점 20% */
export const WEIGHTS = { interests: 0.5, jobs: 0.3, strengths: 0.2 } as const;
/** 학습 데이터(들은 과목·성적)가 있으면 적합도의 35%를 학습 점수로 */
export const LEARN_WEIGHT = 0.35;
/** 서로 다른 단과대학 조합에 더하는 융합 가산점 */
export const FUSION_BONUS = 0.1;

/** 사용자 선택과 트랙 태그가 겹치는 정도 (0~1). 둘 중 작은 쪽 개수로 나눠 태그 수 차이를 보정한다. */
export function overlap(user: readonly string[], track: readonly string[]): number {
  if (!user.length || !track.length) return 0;
  const hit = user.filter((x) => track.includes(x)).length;
  return Math.min(1, hit / Math.min(user.length, track.length));
}

/** 흥미 적합도: 관심 분야·희망 직무·강점 태그 (0~1) */
export function tagFit(t: Track, p: Profile): number {
  return WEIGHTS.interests * overlap(p.interests, t.interests) + WEIGHTS.jobs * overlap(p.jobs, t.jobs) + WEIGHTS.strengths * overlap(p.strengths, t.strengths);
}

/** S(t): 트랙 적합도 (0~1). 학습 데이터가 있으면 흥미 65% + 학습 35% */
export function fit(t: Track, p: Profile): number {
  const tag = tagFit(t, p);
  if (!hasLearning(p.taken)) return tag;
  return (1 - LEARN_WEIGHT) * tag + LEARN_WEIGHT * (learnFit(t, p.taken)?.score ?? 0);
}

export function makeCombo(a: Track, b: Track, p: Profile): Combo {
  const sa = fit(a, p);
  const sb = fit(b, p);
  const base = (sa + sb) / 2;
  const bonus = a.college !== b.college ? FUSION_BONUS : 0;
  return { a, b, sa, sb, base, bonus, total: base + bonus };
}

/**
 * 제1트랙 후보 (전공트랙제도 기준)
 * - 상상력인재학부: 예술학부·글로벌인재대학을 뺀 모든 트랙 (이 앱의 목록에는 둘 다 없음)
 * - 그 외: 소속 모집단위(학부·학과) 안의 트랙
 * - 주·야: 본인 주야에 개설된 트랙만
 * - 제2트랙 전용(창업트랙)은 제외
 */
export function firstCandidates(p: Profile, tracks: Track[] = TRACKS): Track[] {
  const entry = findEntry(p.entry);
  return tracks.filter((t) => {
    if (t.secondOnly) return false;
    if (!sameShift(t, p)) return false;
    return entry.free ? true : t.school === entry.id;
  });
}

/** 제2트랙 후보: 제1트랙을 뺀 전체. 주·야 교차는 제2트랙에서만 허용된다. */
export function secondCandidates(first: Track, tracks: Track[] = TRACKS): Track[] {
  return tracks.filter((t) => t !== first);
}

export const sameShift = (t: Track, p: Profile) => t.offer === "주야" || t.offer === p.day;

/** C(a,b) 순으로 정렬한 전체 조합. a=제1트랙, b=제2트랙 */
export function combos(p: Profile, tracks: Track[] = TRACKS): Combo[] {
  const entry = findEntry(p.entry);
  const out: Combo[] = [];
  for (const a of firstCandidates(p, tracks)) {
    for (const b of secondCandidates(a, tracks)) {
      // 상상력인재학부는 두 트랙 모두 자유이므로, 둘 다 1트랙 후보면 적합도가 높은 쪽을 1트랙으로 둔다
      if (entry.free && !b.secondOnly && sameShift(b, p) && (fit(b, p) > fit(a, p) || (fit(b, p) === fit(a, p) && b.name < a.name))) continue;
      out.push(makeCombo(a, b, p));
    }
  }
  return out.sort((m, n) => n.total - m.total || n.base - m.base || (m.a.name + m.b.name).localeCompare(n.a.name + n.b.name, "ko"));
}

export function rankedTracks(p: Profile, tracks: Track[] = TRACKS): { t: Track; s: number }[] {
  return tracks.map((t) => ({ t, s: fit(t, p) })).sort((m, n) => n.s - m.s || m.t.name.localeCompare(n.t.name, "ko"));
}

export const toPoints = (v: number) => Math.round(v * 100);

export function matches(t: Track, p: Profile) {
  const m = (u: string[], l: string[]) => u.filter((x) => l.includes(x));
  return { interests: m(p.interests, t.interests), jobs: m(p.jobs, t.jobs), strengths: m(p.strengths, t.strengths) };
}

/** 추천 이유 */
export function reasonLines(c: Combo, p: Profile): string[] {
  const lines = [c.a, c.b].map((t, k) => {
    const mm = matches(t, p);
    const bits: string[] = [];
    if (mm.interests.length) bits.push(`관심 '${mm.interests.join("', '")}'`);
    if (mm.jobs.length) bits.push(`직무 '${mm.jobs.join("', '")}'`);
    if (mm.strengths.length) bits.push(`강점 '${mm.strengths.join("', '")}'`);
    const learn = learnReason(learnFit(t, p.taken));
    return `${k === 0 ? "1트랙" : "2트랙"}: ${bits.length ? bits.join(", ") + " 일치" : "흥미 일치 항목 없음"}${learn ? ` · 학습: ${learn}` : ""}`;
  });
  if (c.bonus) lines.push(`서로 다른 단과대학 조합이라 융합 가산 +${toPoints(c.bonus)}`);
  return lines;
}

/** 조합을 고를 때 알아야 할 학사 조건 */
export function comboNotes(c: Combo, p: Profile): string[] {
  const notes: string[] = [];
  for (const t of [c.a, c.b]) {
    if (t.prerequisite) notes.push(`${t.name}: 트랙기초 ${t.prerequisite} 성취 기준 충족 필요`);
    if (t.rename2027) notes.push(`${t.name}: 2027학년도부터 ${t.rename2027}(으)로 명칭 변경`);
  }
  if (c.b.selectiveSecond) notes.push(`${c.b.name}를 제2트랙으로 고르면 주야별 모집인원 30% 이내 선발`);
  if (c.b.secondOnly) notes.push(`${c.b.name}는 제2트랙으로만 선택 가능`);
  if (!sameShift(c.b, p)) notes.push(`${c.b.name}는 ${c.b.offer}에만 개설되어 제2트랙 교차 선택으로만 가능`);
  const shared = c.a.courses.filter((x) => x.req === "기" && c.b.courses.some((y) => y.name === x.name));
  if (shared.length) notes.push(`두 트랙의 전공기초(${shared[0].name})가 같아 전공선택 1과목을 더 들어야 해요`);
  return notes;
}

/**
 * 학생이 고른 두 트랙이 학사 규칙에 맞는지 확인하고 조합을 만든다.
 * 맞지 않으면 null (예: 제1트랙이 소속 모집단위 밖, 같은 트랙 두 번, 제2트랙 전용을 제1트랙으로)
 */
export function validCombo(p: Profile, aName: string, bName: string, tracks: Track[] = TRACKS): Combo | null {
  const a = tracks.find((t) => t.name === aName);
  const b = tracks.find((t) => t.name === bName);
  if (!a || !b || a === b) return null;
  if (!firstCandidates(p, tracks).includes(a)) return null;
  return makeCombo(a, b, p);
}

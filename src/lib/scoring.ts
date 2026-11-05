import { TRACKS } from "../data/tracks";
import type { Combo, Profile, Track } from "../types";

/** 가중치: 관심 분야 50%, 희망 직무 30%, 강점 20% (기획서 5장) */
export const WEIGHTS = { interests: 0.5, jobs: 0.3, strengths: 0.2 } as const;
/** 서로 다른 단과대학 조합에 더하는 융합 가산점 */
export const FUSION_BONUS = 0.1;

/** 사용자 선택과 트랙 태그가 겹치는 정도 (0~1). 둘 중 작은 쪽 개수로 나눠 태그 수 차이를 보정한다. */
export function overlap(user: readonly string[], track: readonly string[]): number {
  if (!user.length || !track.length) return 0;
  const hit = user.filter((x) => track.includes(x)).length;
  return Math.min(1, hit / Math.min(user.length, track.length));
}

/** S(t): 트랙 적합도 (0~1) */
export function fit(t: Track, p: Profile): number {
  return (
    WEIGHTS.interests * overlap(p.interests, t.interests) +
    WEIGHTS.jobs * overlap(p.jobs, t.jobs) +
    WEIGHTS.strengths * overlap(p.strengths, t.strengths)
  );
}

export function makeCombo(a: Track, b: Track, p: Profile): Combo {
  const sa = fit(a, p);
  const sb = fit(b, p);
  const base = (sa + sb) / 2;
  const bonus = a.col !== b.col ? FUSION_BONUS : 0;
  return { a, b, sa, sb, base, bonus, total: base + bonus };
}

/**
 * C(a,b): 두 트랙 조합 점수 순으로 정렬한 전체 후보.
 * - 상상력인재학부(유형 1): 모든 트랙에서 두 개를 고르고, 적합도가 높은 쪽을 1트랙으로 둔다.
 * - 그 외(유형 2): 1트랙은 입학한 단과대학 안에서, 2트랙은 전체에서 고른다.
 */
export function combos(p: Profile, tracks: Track[] = TRACKS): Combo[] {
  const out: Combo[] = [];
  for (let x = 0; x < tracks.length; x++) {
    for (let y = 0; y < tracks.length; y++) {
      if (x === y) continue;
      let a = tracks[x];
      let b = tracks[y];
      if (p.entry === "FREE") {
        if (x > y) continue;
        if (fit(b, p) > fit(a, p)) [a, b] = [b, a];
      } else if (a.col !== p.entry) {
        continue;
      }
      out.push(makeCombo(a, b, p));
    }
  }
  return out.sort(
    (m, n) => n.total - m.total || n.base - m.base || (m.a.name + m.b.name).localeCompare(n.a.name + n.b.name, "ko"),
  );
}

export function rankedTracks(p: Profile, tracks: Track[] = TRACKS): { t: Track; s: number }[] {
  return tracks
    .map((t) => ({ t, s: fit(t, p) }))
    .sort((m, n) => n.s - m.s || m.t.name.localeCompare(n.t.name, "ko"));
}

export const toPoints = (v: number) => Math.round(v * 100);

export function matches(t: Track, p: Profile) {
  const m = (u: string[], l: string[]) => u.filter((x) => l.includes(x));
  return { interests: m(p.interests, t.interests), jobs: m(p.jobs, t.jobs), strengths: m(p.strengths, t.strengths) };
}

/** 추천 이유 문장 (AI 설명의 규칙 기반 버전) */
export function reasonLines(c: Combo, p: Profile): string[] {
  const lines = [c.a, c.b].map((t, k) => {
    const mm = matches(t, p);
    const bits: string[] = [];
    if (mm.interests.length) bits.push(`관심 '${mm.interests.join("', '")}'`);
    if (mm.jobs.length) bits.push(`직무 '${mm.jobs.join("', '")}'`);
    if (mm.strengths.length) bits.push(`강점 '${mm.strengths.join("', '")}'`);
    return `${k === 0 ? "1트랙" : "2트랙"}: ${bits.length ? bits.join(", ") + " 일치" : "일치 항목 없음, 조합 보완용"}`;
  });
  if (c.bonus) lines.push(`서로 다른 단과대학 조합이라 융합 가산 +${toPoints(c.bonus)}`);
  return lines;
}

export const findTrack = (name: string, tracks: Track[] = TRACKS) => tracks.find((t) => t.name === name) ?? null;

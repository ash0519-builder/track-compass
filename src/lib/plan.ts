import { MODE_RULES, type MajorSpec } from "../data/rules";
import type { Combo, MajorMode, Plan, Profile, Track } from "../types";
import { firstCandidates, validCombo } from "./scoring";

export const MODES: MajorMode[] = ["fusion1", "fusion2", "deep", "undecided"];
export const isMode = (v: unknown): v is MajorMode => typeof v === "string" && (MODES as string[]).includes(v);

/** 이 제1트랙(학과)으로 고를 수 있는 이수 방식인지 (융합전공Ⅱ·심화전공은 학과만) */
export const modeAllowed = (mode: MajorMode, a: Track) => !MODE_RULES[mode].deptOnly || a.kind === "학과";

export const planOf = (c: Combo): Plan => ({ mode: "fusion1", a: c.a, b: c.b, combo: c });

/** 저장된 선택을 지금 진단 결과의 규칙에 맞는 계획으로 바꾼다. 맞지 않으면 fallback(추천 1순위) */
export function resolvePlan(p: Profile, pick: [string, string | null] | null | undefined, mode: MajorMode | undefined, fallback: Combo): Plan {
  if (!pick) return planOf(fallback);
  const m = mode ?? "fusion1";
  const a = firstCandidates(p).find((t) => t.name === pick[0]);
  if (!a || !modeAllowed(m, a)) return planOf(fallback);
  if (!MODE_RULES[m].b) return { mode: m, a, b: null, combo: null };
  const c = pick[1] ? validCombo(p, pick[0], pick[1]) : null;
  return c ? { mode: m, a: c.a, b: c.b, combo: c } : planOf(fallback);
}

export interface PlanPart {
  kind: "a" | "b";
  t: Track;
  spec: MajorSpec;
}

/** 계획에 들어가는 전공과 각 전공의 최소 이수 학점 */
export function planParts(plan: Plan): PlanPart[] {
  const r = MODE_RULES[plan.mode];
  const a = plan.mode === "deep" && plan.a.college === "CON" ? { ...r.a, req: 21 } : r.a;
  const parts: PlanPart[] = [{ kind: "a", t: plan.a, spec: a }];
  if (plan.b && r.b) parts.push({ kind: "b", t: plan.b, spec: r.b });
  return parts;
}

/** 화면에 쓰는 계획 이름 */
export function planTitle(plan: Plan): string {
  if (plan.mode === "deep") return `${plan.a.name} 심화전공`;
  if (plan.mode === "fusion2") return `${plan.a.name} + 부전공 ${plan.b!.name}`;
  if (plan.mode === "undecided") return `${plan.a.name} + 제2트랙 미정`;
  return `${plan.a.name} + ${plan.b!.name}`;
}

export const planKey = (plan: Plan) => `${plan.mode}:${plan.a.name}:${plan.b?.name ?? ""}`;

/** 계획에 들어간 트랙들 */
export const planTracks = (plan: Plan): Track[] => (plan.b ? [plan.a, plan.b] : [plan.a]);

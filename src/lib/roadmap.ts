import { JOB_EXTRA } from "../data/tracks";
import type { AppState, Combo, ItemKind, PlanItem, Profile, Roadmap } from "../types";

const short = (name: string) => name.replace(/(트랙|학과)$/, "");

/**
 * 1-1부터 4-2까지 8개 학기의 교과·비교과 계획을 만든다.
 * 교과목과 포인트는 예시이며, 본 개발에서 트랙별 교과목 로드맵과 연동한다.
 */
export function buildRoadmap(c: Combo, p: Profile): Roadmap {
  const A = c.a;
  const B = c.b;
  const job = p.jobs[0];
  const jobExtra = job ? JOB_EXTRA[job] ?? "교내 공모전 참가" : "교내 공모전 참가";

  const course = (kind: ItemKind, name: string, unit = 3): Omit<PlanItem, "id"> => ({
    kind,
    name,
    unit,
    sub: kind === "a" ? A.name : kind === "b" ? B.name : "교양·공통",
  });
  const extra = (name: string, pts: number, sub = "비교과"): Omit<PlanItem, "id"> => ({ kind: "x", name, unit: pts, sub });

  const plan: Omit<PlanItem, "id">[][] = [
    [course("a", A.courses[0]), course("b", B.courses[0]), course("n", "사고와 표현"), extra("대학생활길라잡이", 40), extra("진로탐색 프로그램", 40)],
    [course("a", A.courses[1]), course("b", B.courses[1]), course("n", "교양 선택"), extra("전공트랙탐색 프로그램", 50), extra("트랙 팀상담", 30)],
    [course("a", A.courses[2]), course("b", B.courses[2]), course("n", "교양 선택"), extra("한성튜터링", 60), extra(jobExtra, 60, "희망 직무 연계")],
    [course("a", A.courses[3]), course("b", B.courses[3]), course("n", "트랙 간 융합 교과"), extra("HSP(High Success Project)", 100, "공모전 공지 기준 100pt"), extra("트랙 특강·워크숍", 40)],
    [course("a", A.courses[4]), course("b", `${short(B.name)} 전공선택`), extra("교내 공모전", 80), extra("직무 자격증 준비", 40, "희망 직무 연계")],
    [course("a", `${short(A.name)} 전공선택`), course("b", B.courses[4]), extra("현장실습", 120)],
    [course("a", `${short(A.name)} 심화선택`), course("b", `${short(B.name)} 심화선택`), extra("취업멘토링", 60), extra("한성인 프레젠테이션대회", 40)],
    [course("n", "교양 선택"), { kind: "n", name: "졸업요건 최종 점검", unit: 0, sub: "트랙별 졸업요건·비교과 확인" }, extra("진로취업 상담", 40), extra("봉사 활동", 40)],
  ];

  // id에 학기·종류·이름을 넣어, 조합을 바꿔도 공통 항목의 체크가 유지되게 한다.
  return plan.map((items, k) => items.map((it) => ({ ...it, id: `s${k}:${it.kind}:${it.name}` })));
}

export const nowIndex = (p: Profile) => (p.year - 1) * 2 + (p.sem - 1);

export function unitText(it: PlanItem): string {
  if (it.unit === 0) return "점검";
  return it.kind === "x" ? `${it.unit}pt` : `${it.unit}학점`;
}

export interface Progress {
  a: { done: number; total: number; credits: number };
  b: { done: number; total: number; credits: number };
  extraPts: number;
}

export function progress(rm: Roadmap, checks: AppState["checks"]): Progress {
  const r: Progress = { a: { done: 0, total: 0, credits: 0 }, b: { done: 0, total: 0, credits: 0 }, extraPts: 0 };
  for (const sem of rm) {
    for (const it of sem) {
      const done = !!checks[it.id];
      if (it.kind === "a" || it.kind === "b") {
        r[it.kind].total++;
        if (done) {
          r[it.kind].done++;
          r[it.kind].credits += it.unit;
        }
      }
      if (it.kind === "x" && done) r.extraPts += it.unit;
    }
  }
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

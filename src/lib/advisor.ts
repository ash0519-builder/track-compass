import { COLLEGES, EXTRA_GOAL, SEM_NAMES, TRACKS } from "../data/tracks";
import type { AppState, Combo, Roadmap } from "../types";
import { eul, eun } from "./korean";
import { nowIndex, progress, unitText } from "./roadmap";
import { fit, makeCombo, reasonLines, toPoints } from "./scoring";

export interface AdvisorContext {
  state: AppState;
  pick: Combo;
  top: Combo[];
  roadmap: Roadmap;
}

export const SUGGESTIONS = [
  "왜 이 조합을 추천했어?",
  "이번 학기에 뭐 해야 해?",
  "비교과 포인트 얼마나 남았어?",
  "빅데이터트랙으로 바꾸면 어떻게 돼?",
  "졸업하려면 뭐가 필요해?",
];

/**
 * AI 상담의 규칙 기반 버전.
 * 본 개발에서는 같은 입력(프로필, 추천 결과, 로드맵)을 LLM에 넘기고
 * 학교 공식 자료 검색(RAG)으로 근거를 붙인다.
 */
export function answer(q: string, ctx: AdvisorContext): string {
  const { state, pick: c, top, roadmap: rm } = ctx;
  const p = state.profile;
  const pr = progress(rm, state.checks);
  const now = nowIndex(p);

  const named = TRACKS.filter((t) => q.includes(t.name) || q.includes(t.name.replace(/(트랙|학과)$/, ""))).sort(
    (m, n) => n.name.length - m.name.length,
  )[0];

  if (/바꾸|변경|바꿔|대신/.test(q) || (named && named !== c.a && named !== c.b)) {
    if (!named) {
      const alt = top[1];
      return alt
        ? `어느 트랙으로 바꿀지 트랙 이름을 함께 알려주세요.\n참고로 지금 기준 2순위 조합은 ${alt.a.name} + ${alt.b.name} (${toPoints(alt.total)}점)이에요.`
        : "어느 트랙으로 바꿀지 트랙 이름을 함께 알려주세요.";
    }
    if (named === c.a || named === c.b) return `${named.name}${eun(named.name)} 이미 선택한 조합에 들어 있어요. 다른 트랙 이름으로 물어보세요.`;

    const fa = fit(c.a, p);
    const fb = fit(c.b, p);
    let replace: "a" | "b" = fa < fb ? "a" : "b";
    let why = fa === fb ? "두 트랙 적합도가 같아서" : "적합도가 더 낮은";
    if (p.entry !== "FREE" && replace === "a" && named.col !== p.entry) {
      replace = "b";
      why = "1트랙은 단과대학 안에서 골라야 해서 2트랙인";
    }
    const out = replace === "a" ? c.a : c.b;
    const next = replace === "a" ? makeCombo(named, c.b, p) : makeCombo(c.a, named, p);
    const doneOut = rm.flat().filter((it) => state.checks[it.id] && it.sub === out.name).map((it) => it.name);

    return [
      `${why} ${out.name} 자리에 ${named.name}${eul(named.name)} 넣어 계산해 봤어요.`,
      `• 새 조합: ${next.a.name} + ${next.b.name} → ${toPoints(next.total)}점 (지금 ${toPoints(c.total)}점)`,
      `• ${named.name} 적합도 ${toPoints(fit(named, p))}점, ${out.name} 적합도 ${toPoints(fit(out, p))}점`,
      doneOut.length
        ? `• 이미 들은 ${out.name} 과목 ${doneOut.length}개(${doneOut.join(", ")})는 전공 인정 여부를 확인해야 해요. 학사운영팀의 '트랙 간 상호 전공과목 변경신청' 제도를 참고하세요.`
        : `• 아직 ${out.name} 과목을 이수하지 않아 바꿔도 손해가 적어요.`,
      "트랙 변경은 횟수 제한이 없지만, 결정 전에 지도교수 상담을 권해요.",
    ].join("\n");
  }

  if (/왜|이유|추천/.test(q)) {
    return [
      `지금 조합은 ${c.a.name} + ${c.b.name}이고 ${toPoints(c.total)}점이에요.`,
      ...reasonLines(c, p).map((l) => `• ${l}`),
      "점수는 관심 분야 50%, 희망 직무 30%, 강점 20%로 계산했어요.",
    ].join("\n");
  }

  if (/이번 학기|뭐 해|할 일|해야/.test(q)) {
    if (now > 7) return "로드맵의 모든 학기가 지났어요. 졸업요건 점검을 해보세요.";
    const todo = rm[now].filter((it) => !state.checks[it.id]);
    if (!todo.length) return `${SEM_NAMES[now]} 항목을 모두 완료했어요. 다음 학기 계획을 미리 살펴보세요.`;
    return [`${SEM_NAMES[now]}에 남은 항목은 ${todo.length}개예요.`, ...todo.map((it) => `• ${it.name} (${unitText(it)})`)].join("\n");
  }

  if (/비교과|포인트|pt|HSP/i.test(q)) {
    const left = Math.max(0, EXTRA_GOAL - pr.extraPts);
    const next = rm
      .slice(now)
      .flat()
      .filter((it) => it.kind === "x" && !state.checks[it.id])
      .slice(0, 3)
      .map((it) => `${it.name} ${it.unit}pt`);
    return [
      `지금까지 ${pr.extraPts}pt를 쌓았고, ${EXTRA_GOAL}pt까지 ${left}pt 남았어요.`,
      `가까운 비교과: ${next.join(", ") || "없음"}`,
      "지금 참여 중인 e-Advisor 공모전도 HSP 실적으로 인정되고 100pt가 지급돼요.",
    ].join("\n");
  }

  if (/졸업/.test(q)) {
    return [
      "공개 자료 기준 졸업에 필요한 것:",
      "• 2개 트랙(1트랙·2트랙) 이수",
      `• 비교과포인트 ${EXTRA_GOAL}pt (2016학년도 이후 입학자 안내 기준, 현재 기준 확인 필요)`,
      "• 트랙별 전공 이수 학점은 각 트랙 홈페이지의 '트랙졸업요건'에서 확인",
      `지금 로드맵상 1트랙 ${pr.a.done}/${pr.a.total}과목, 2트랙 ${pr.b.done}/${pr.b.total}과목을 마쳤어요.`,
    ].join("\n");
  }

  if (/유형|모집단위|어디서/.test(q)) {
    return p.entry === "FREE"
      ? "상상력인재학부(유형 1)라서 1트랙과 2트랙 모두 전체 트랙에서 고를 수 있어요."
      : `${COLLEGES[p.entry]}(유형 2)라서 1트랙은 단과대학 안에서, 2트랙은 전체 트랙에서 골라요.`;
  }

  return "이렇게 물어보세요: 추천 이유, 이번 학기 할 일, 비교과 포인트, 트랙 변경(트랙 이름 포함), 졸업요건.";
}

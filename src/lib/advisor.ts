import { GRAD, SOURCES } from "../data/rules";
import { COLLEGES, findEntry, SEM_NAMES, TRACKS } from "../data/tracks";
import type { AppState, Combo, Roadmap } from "../types";
import { eul, eun } from "./korean";
import { nowIndex, progress, unitText } from "./roadmap";
import { statusOf, THEMES, type Scored } from "./programs";
import { comboNotes, firstCandidates, fit, makeCombo, reasonLines, toPoints } from "./scoring";

export interface AdvisorContext {
  state: AppState;
  pick: Combo;
  top: Combo[];
  roadmap: Roadmap;
  recs?: Scored[];
}

export const SUGGESTIONS = [
  "왜 이 조합을 추천했어?",
  "이번 학기에 뭐 해야 해?",
  "비교과 포인트 얼마나 남았어?",
  "영어 관련 비교과 추천해줘",
  "빅데이터트랙으로 바꾸면 어떻게 돼?",
  "졸업하려면 뭐가 필요해?",
  "1트랙은 어디서 골라야 해?",
];

/**
 * 상담 응답 (규칙 기반).
 * 답변 근거는 앱에 담긴 한성대 공식 교육과정·학사 제도 데이터와 학생의 로드맵이다.
 */
export function answer(q: string, ctx: AdvisorContext): string {
  const { state, pick: c, top, roadmap: rm } = ctx;
  const p = state.profile;
  const entry = findEntry(p.entry);
  const pr = progress(rm, state.checks, state.myPoints);
  const now = nowIndex(p);

  const named = TRACKS.filter((t) => q.includes(t.name) || q.includes(t.name.replace(/(트랙|학과)$/, ""))).sort((m, n) => n.name.length - m.name.length)[0];

  const themeAsked = THEMES.find((t) => q.includes(t.label.split("·")[0]) || (t.id === "english" && /영어|외국어|어학/.test(q)));
  const asksPrograms = !!ctx.recs && (/비교과|프로그램/.test(q) || !!themeAsked) && !/조합|포인트|pt|남았|졸업/.test(q);

  if (/바꾸|변경|바꿔|대신/.test(q) || (named && named !== c.a && named !== c.b)) {
    if (!named) {
      const alt = top[1];
      return [
        "어느 트랙으로 바꿀지 트랙 이름을 함께 알려주세요.",
        alt ? `참고로 지금 기준 2순위 조합은 ${alt.a.name} + ${alt.b.name} (${toPoints(alt.total)}점)이에요.` : "",
        "트랙 변경은 3~7학기 재학생이 2학년 2학기 직전 학기부터 신청할 수 있어요.",
      ].filter(Boolean).join("\n");
    }
    if (named === c.a || named === c.b) return `${named.name}${eun(named.name)} 이미 선택한 조합에 들어 있어요. 다른 트랙 이름으로 물어보세요.`;

    const canBeFirst = firstCandidates(p).includes(named);
    const fa = fit(c.a, p);
    const fb = fit(c.b, p);
    let replace: "a" | "b" = canBeFirst && fa < fb ? "a" : "b";
    if (named.secondOnly) replace = "b";
    const out = replace === "a" ? c.a : c.b;
    const next = replace === "a" ? makeCombo(named, c.b, p) : makeCombo(c.a, named, p);
    const doneOut = rm.flat().filter((it) => state.checks[it.id] && it.kind === replace).map((it) => it.name);

    const lines = [
      `${replace === "a" ? "제1트랙" : "제2트랙"}인 ${out.name} 자리에 ${named.name}${eul(named.name)} 넣어 계산해 봤어요.`,
      `• 새 조합: ${next.a.name} + ${next.b.name} → ${toPoints(next.total)}점 (지금 ${toPoints(c.total)}점)`,
      `• 적합도: ${named.name} ${toPoints(fit(named, p))}점, ${out.name} ${toPoints(fit(out, p))}점`,
      doneOut.length
        ? `• 이미 들은 ${out.name} 과목 ${doneOut.length}개(${doneOut.slice(0, 4).join(", ")}${doneOut.length > 4 ? " 등" : ""})는 트랙을 바꾸면 일반선택 학점으로 바뀌어요. 두 트랙이 서로 인정하는 과목이면 학사운영팀의 '트랙 간 상호 전공과목 변경신청'으로 옮길 수 있어요.`
        : `• 아직 ${out.name} 과목을 이수하지 않아 바꿔도 학점 손실은 없어요.`,
    ];
    if (!canBeFirst && replace === "a") lines.push(`※ ${named.name}${eun(named.name)} 제1트랙으로 고를 수 없어요(소속 모집단위 밖).`);
    if (replace === "a" && !entry.free && named.school !== entry.id) lines.push("※ 제1트랙을 소속 모집단위 밖으로 바꾸면 전부(과) 선발 절차를 거쳐요.");
    for (const n of comboNotes(next, p)) lines.push(`※ ${n}`);
    lines.push("결정 전에 지도교수(전공설계지도) 상담을 권해요.");
    return lines.join("\n");
  }

  if (/1트랙|제1|어디서|모집단위|유형/.test(q)) {
    if (entry.free) return "상상력인재학부는 제1트랙을 거의 모든 트랙에서 고를 수 있어요(예술학부·글로벌인재대학 제외). 2학년 진학 시 고른 제1트랙의 학부로 소속이 바뀌어요.";
    if (entry.dept) return `${entry.name} 입학생은 제1전공을 본인 학과로 하고, 제2트랙은 자유롭게 고르거나 단일전공을 선택할 수 있어요.`;
    const list = firstCandidates(p).map((t) => t.name);
    return `${entry.name} 입학생은 제1트랙을 학부 안에서 골라야 해요 (${p.day} 기준 ${list.length}개): ${list.join(", ")}.\n제2트랙은 다른 단과대학에서도 자유롭게 고를 수 있어요.`;
  }

  if (/왜|이유|추천/.test(q) && !asksPrograms) {
    return [
      `지금 조합은 ${c.a.name} + ${c.b.name}이고 ${toPoints(c.total)}점이에요.`,
      ...reasonLines(c, p).map((l) => `• ${l}`),
      ...comboNotes(c, p).map((n) => `※ ${n}`),
      "점수는 관심 분야 50%, 희망 직무 30%, 강점 20%로 계산했어요.",
    ].join("\n");
  }

  if (/이번 학기|뭐 해|할 일|해야/.test(q)) {
    if (now > 7) return "로드맵의 모든 학기가 지났어요. 졸업요건 점검을 해보세요.";
    const todo = rm[now].filter((it) => !state.checks[it.id]);
    if (!todo.length) return `${SEM_NAMES[now]} 항목을 모두 완료했어요. 다음 학기 계획을 미리 살펴보세요.`;
    return [`${SEM_NAMES[now]}에 남은 항목은 ${todo.length}개예요.`, ...todo.map((it) => `• ${it.name} (${unitText(it)})`)].join("\n");
  }

  if (asksPrograms && ctx.recs) {
    const list = (themeAsked ? ctx.recs.filter((r) => r.themes.includes(themeAsked.id)) : ctx.recs).slice(0, 5);
    if (!list.length) return `${themeAsked?.label ?? ""} 관련 프로그램을 찾지 못했어요. '비교과 추천' 탭에서 다른 카테고리를 확인해 보세요.`;
    return [
      `${themeAsked ? `'${themeAsked.label}' 카테고리에서 ` : ""}진로 진단 결과에 맞는 비교과예요.`,
      ...list.map((r) => `• ${r.p.t} (${r.p.p ? r.p.p + "pt" : "포인트 공지 확인"}, ${r.p.o}${statusOf(r.p) === "open" ? ", 지금 신청 가능" : ""})`),
      "'비교과 추천' 탭에서 로드맵에 담을 수 있어요.",
    ].join("\n");
  }

  if (/비교과|포인트|pt|HSP/i.test(q)) {
    const left = Math.max(0, GRAD.extraPoints - pr.extraPts);
    return [
      `${state.myPoints !== null ? "입력한 누적 포인트" : "로드맵에서 체크한 포인트"} 기준 ${pr.extraPts}pt, 졸업까지 ${left}pt 남았어요.`,
      `• 2016학년도 입학자부터 비교과포인트 ${GRAD.extraPoints}pt가 졸업요건이에요.`,
      `• 학기마다 최대 ${GRAD.semesterCap}pt까지 인정되고, 초과분은 200pt 한도로 다음 학기로 이월돼요.`,
      "• HSP(High Success Project)는 3개월 100pt, 6개월 200pt, 12개월 300pt예요. e-Advisor 공모전도 HSP로 신청해요.",
      "정확한 누적 포인트는 스마트자기관리시스템에서 확인하고 로드맵 탭에 입력해 주세요.",
    ].join("\n");
  }

  if (/졸업/.test(q)) {
    return [
      `한성대 졸업요건 (16학번 이후, 출처: ${SOURCES.graduation.label})`,
      `• 교과 ${GRAD.total}학점: 전공 ${GRAD.major}학점(트랙당 ${GRAD.perTrack}학점 = ${GRAD.perTrackDetail}), 교양 ${GRAD.liberal}학점, 자유선택 ${GRAD.free}학점`,
      `• 비교과포인트 ${GRAD.extraPoints}pt (미충족 시 수료 처리)`,
      `• 트랙별 졸업요건(캡스톤·졸업작품 등)은 각 트랙 홈페이지에서 확인`,
      `지금 체크 기준: 1트랙 ${pr.a}/${GRAD.perTrack}학점, 2트랙 ${pr.b}/${GRAD.perTrack}학점, 교양 ${pr.liberal}/${GRAD.liberal}학점.`,
    ].join("\n");
  }

  if (/2027|개편|이름/.test(q)) {
    const r = [c.a, c.b].filter((t) => t.rename2027 || COLLEGES[t.college].rename2027);
    return r.length
      ? r.map((t) => `• ${t.name}: ${t.rename2027 ? `→ ${t.rename2027}` : ""}${COLLEGES[t.college].rename2027 ? ` (단과대학 ${COLLEGES[t.college].name} → ${COLLEGES[t.college].rename2027})` : ""}`).join("\n")
      : "선택한 두 트랙은 2027학년도 개편 명칭 변경 대상이 아니에요.";
  }

  return "이렇게 물어보세요: 추천 이유, 이번 학기 할 일, 비교과 포인트, 트랙 변경(트랙 이름 포함), 졸업요건, 1트랙 선택 범위.";
}

import { GRAD, liberalTotal, MODE_RULES, SOURCES } from "../data/rules";
import { COLLEGES, findEntry, SEM_NAMES, TRACKS } from "../data/tracks";
import type { AppState, Combo, Plan, Roadmap } from "../types";
import { planParts, planTitle, planTracks } from "./plan";
import { eul, eun } from "./korean";
import { admissionOf, nowIndex, progress, semesterCredits, unitText } from "./roadmap";
import { statusOf, THEMES, type Scored } from "./programs";
import { comboNotes, firstCandidates, fit, makeCombo, reasonLines, toPoints } from "./scoring";

export interface AdvisorContext {
  state: AppState;
  plan: Plan;
  top: Combo[];
  roadmap: Roadmap;
  recs?: Scored[];
}

/** 모든 트랙의 과목 이름 → 개설 정보 */
const COURSE_INDEX = (() => {
  const m = new Map<string, { track: string; term: string; req: string }[]>();
  for (const t of TRACKS) for (const c of t.courses) m.set(c.name, [...(m.get(c.name) ?? []), { track: t.name, term: c.term, req: c.req }]);
  return m;
})();
const REQ_NAME: Record<string, string> = { 기: "전공기초", 필: "전공필수", 선: "전공선택" };
const squash = (x: string) => x.replace(/\s+/g, "").toLowerCase();

/** 질문에 들어 있는 과목 이름 (가장 긴 것) */
function findCourse(q: string): string | null {
  const sq = squash(q);
  let best: string | null = null;
  for (const name of COURSE_INDEX.keys()) {
    const sn = squash(name);
    if (sn.length >= 3 && sq.includes(sn) && (!best || sn.length > squash(best).length)) best = name;
  }
  return best;
}

export const SUGGESTIONS = [
  "왜 이 조합을 추천했어?",
  "이번 학기에 뭐 해야 해?",
  "비교과 포인트 얼마나 남았어?",
  "영어 관련 비교과 추천해줘",
  "빅데이터트랙으로 바꾸면 어떻게 돼?",
  "졸업하려면 뭐가 필요해?",
  "캡스톤디자인 언제 들어?",
  "1트랙은 어디서 골라야 해?",
  "2트랙 안 해도 돼?",
];

/**
 * 상담 응답 (규칙 기반).
 * 답변 근거는 앱에 담긴 한성대 공식 교육과정·학사 제도 데이터와 학생의 로드맵이다.
 */
const pr0 = (ctx: AdvisorContext) => progress(ctx.roadmap, ctx.state.checks, ctx.state.myPoints);

/** 제2트랙 없이 이수하는 방법 안내 */
function modeAnswer(ctx: AdvisorContext): string {
  const p = ctx.state.profile;
  const entry = findEntry(p.entry);
  const dept = entry.dept || ctx.plan.a.kind === "학과";
  const rules = (["deep", "fusion2", "fusion1"] as const).map((m) => `• ${MODE_RULES[m].name}: ${MODE_RULES[m].desc}`);
  return (
    dept
      ? [`학과 소속이면 제2트랙 없이도 이수할 수 있어요 (출처: ${SOURCES.majorCredits.label}).`, ...rules]
      : [
          `트랙제로 입학한 학생은 2학년 진학 시 제1트랙과 제2트랙을 모두 골라야 해요 (출처: ${SOURCES.trackSystem.label}).`,
          "심화전공(학과 78학점)과 융합전공Ⅱ(학과 57학점 + 부전공 21학점)는 학과 소속 학생이 고르는 방식이에요.",
          "아직 제2트랙을 못 정했다면 '트랙 추천' 탭의 직접 고르기에서 '제2트랙 아직 안 정함'으로 제1트랙만 먼저 계획할 수 있어요.",
        ]
  )
    .concat([`지금 계획: ${planTitle(ctx.plan)}. '트랙 추천' 탭의 직접 고르기에서 바꿀 수 있어요.`])
    .join("\n");
}

export function answer(q: string, ctx: AdvisorContext): string {
  const { state, plan, top, roadmap: rm } = ctx;
  const c = plan.combo;
  const mine = planTracks(plan);
  const roleB = plan.mode === "fusion2" ? "부전공" : "제2트랙";
  const majorProgress = [
    ...planParts(plan).map((x) => `${x.spec.label} ${x.kind === "a" ? pr0(ctx).a : pr0(ctx).b}/${x.spec.total}학점`),
    ...(plan.mode === "undecided" ? ["2트랙 미정"] : []),
  ].join(", ");
  const p = state.profile;
  const entry = findEntry(p.entry);
  const pr = progress(rm, state.checks, state.myPoints);
  const now = nowIndex(p);

  const named = TRACKS.filter((t) => q.includes(t.name) || q.includes(t.name.replace(/(트랙|학과)$/, ""))).sort((m, n) => n.name.length - m.name.length)[0];

  const themeAsked = THEMES.find((t) => q.includes(t.label.split("·")[0]) || (t.id === "english" && /영어|외국어|어학/.test(q)));
  const asksPrograms = !!ctx.recs && (/비교과|프로그램/.test(q) || !!themeAsked) && !/조합|포인트|pt|남았|졸업|점수|성적|토익/i.test(q);

  if (/2트랙.*(안|없|말|필수|꼭|미정)|단일 ?전공|심화 ?전공|부전공|이수 ?방식|융합전공/.test(q) && !named) return modeAnswer(ctx);

  if (/바꾸|변경|바꿔|대신/.test(q) || (named && !mine.includes(named))) {
    if (!named) {
      const alt = top.find((x) => !c || x.a !== c.a || x.b !== c.b);
      return [
        "어느 트랙으로 바꿀지 트랙 이름을 함께 알려주세요.",
        alt ? `참고로 지금 기준 추천 조합은 ${alt.a.name} + ${alt.b.name} (${toPoints(alt.total)}점)이에요.` : "",
        "트랙 변경은 3~7학기 재학생이 2학년 2학기 직전 학기부터 신청할 수 있어요.",
      ].filter(Boolean).join("\n");
    }
    if (mine.includes(named)) return `${named.name}${eun(named.name)} 이미 지금 계획에 들어 있어요. 다른 트랙 이름으로 물어보세요.`;

    if (!c || !plan.b) {
      // 제2트랙이 없는 계획: 물어본 트랙을 제2트랙으로 넣어 본다
      const next = makeCombo(plan.a, named, p);
      return [
        `지금은 ${MODE_RULES[plan.mode].name} 계획이라 제2트랙이 없어요. ${named.name}${eul(named.name)} 제2트랙으로 넣으면:`,
        `• 조합: ${next.a.name} + ${next.b.name} → ${toPoints(next.total)}점 (적합도 ${named.name} ${toPoints(fit(named, p))}점)`,
        plan.mode === "deep" ? `• 융합전공Ⅰ(두 트랙 각 ${GRAD.perTrack}학점)로 바뀌어 ${plan.a.name} 전공은 ${GRAD.perTrack}학점만 채우면 돼요.` : "",
        ...comboNotes(next, p).map((n) => `※ ${n}`),
        "'트랙 추천' 탭의 직접 고르기에서 바꿀 수 있어요.",
      ].filter(Boolean).join("\n");
    }

    const canBeFirst = firstCandidates(p).includes(named) && plan.mode !== "fusion2";
    const fa = fit(c.a, p);
    const fb = fit(c.b, p);
    let replace: "a" | "b" = canBeFirst && fa < fb ? "a" : "b";
    if (named.secondOnly) replace = "b";
    const out = replace === "a" ? c.a : c.b;
    const next = replace === "a" ? makeCombo(named, c.b, p) : makeCombo(c.a, named, p);
    const doneOut = rm.flat().filter((it) => state.checks[it.id] && it.kind === replace).map((it) => it.name);

    const lines = [
      `${replace === "a" ? "제1트랙" : roleB}인 ${out.name} 자리에 ${named.name}${eul(named.name)} 넣어 계산해 봤어요.`,
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
    if (entry.dept) return `${entry.name} 입학생은 제1전공을 본인 학과로 하고, 제2트랙을 자유롭게 고르거나(융합전공Ⅰ) 부전공(융합전공Ⅱ)·심화전공(제2트랙 없음)을 선택할 수 있어요.`;
    const list = firstCandidates(p).map((t) => t.name);
    return `${entry.name} 입학생은 제1트랙을 학부 안에서 골라야 해요 (${p.day} 기준 ${list.length}개): ${list.join(", ")}.\n제2트랙은 다른 단과대학에서도 자유롭게 고를 수 있어요.`;
  }

  if (/왜|이유|추천/.test(q) && !asksPrograms) {
    if (!c) {
      return [
        `지금 계획은 ${planTitle(plan)}이에요 (${MODE_RULES[plan.mode].name}).`,
        `• ${plan.a.name} 적합도 ${toPoints(fit(plan.a, p))}점`,
        top[0] ? `• 두 트랙으로 한다면 추천 1순위는 ${top[0].a.name} + ${top[0].b.name} (${toPoints(top[0].total)}점)이에요.` : "",
        "점수는 관심 분야 50%, 희망 직무 30%, 강점 20%로 계산했어요.",
      ].filter(Boolean).join("\n");
    }
    return [
      `지금 조합은 ${c.a.name} + ${c.b.name}${plan.mode === "fusion2" ? "(부전공)" : ""}이고 ${toPoints(c.total)}점이에요.`,
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

  if (/최대 ?학점|몇 ?학점까지|학점 ?이월|이월|학기당|한 ?학기에 ?몇|수강 ?신청 ?학점|너무 많|과부하/.test(q) && !/pt|포인트|비교과/i.test(q)) {
    const loads = rm.map(semesterCredits);
    const heavy = loads.map((v, k) => ({ v, k })).filter((x) => x.k >= nowIndex(state.profile) && x.v > GRAD.semesterMax);
    return [
      `학기당 수강신청은 16학번 이후 6~${GRAD.semesterMax}학점이에요 (출처: ${SOURCES.creditLimit.label}).`,
      `• 직전 학기에 ${GRAD.semesterMax}학점보다 적게 신청했다면 남은 학점을 최대 3학점까지 다음 학기로 이월해 ${GRAD.semesterMaxCarry}학점까지 들을 수 있어요.`,
      "• 직전 학기 15학점 이상·평점 4.0 이상·F 없는 성적우수자는 학점이월과 별도로 더 신청할 수 있어요 (학사 공지 확인).",
      heavy.length
        ? `내 로드맵에서 ${GRAD.semesterMax}학점을 넘는 학기: ${heavy.map((x) => `${SEM_NAMES[x.k]} ${x.v}학점`).join(", ")}. 전공선택이나 교양을 다른 학기로 옮기거나 계절학기를 검토하세요.`
        : `내 로드맵의 남은 학기는 모두 ${GRAD.semesterMax}학점 이하예요 (가장 많은 학기 ${Math.max(...loads)}학점).`,
    ].join("\n");
  }

  if (/재수강/.test(q)) {
    return [
      `재수강 규정이에요 (출처: ${SOURCES.retake.label}).`,
      "• 한 학기 3학점 이내, 재학 중 12학점 이내 (4학년은 학기 제한 없이 전체 12학점 이내)",
      "• 재수강 성적은 최고 A까지, 마지막 성적만 인정되고 성적표에 'R' 표시",
      "• 11학번 이후 F 과목 재수강은 12학점 제한을 받지 않고, 계절학기 재수강도 12학점에 포함되지 않아요.",
      "• 교육과정에서 폐지된 과목은 재수강할 수 없어요.",
    ].join("\n");
  }

  if (/졸업/.test(q)) {
    const lib = liberalTotal(admissionOf(state.profile));
    return [
      `한성대 졸업요건 (16학번 이후, 출처: ${SOURCES.graduation.label})`,
      `• 교과 ${GRAD.total}학점: 전공 ${GRAD.major}학점(${MODE_RULES[plan.mode === "undecided" ? "fusion1" : plan.mode].name}: ${MODE_RULES[plan.mode === "undecided" ? "fusion1" : plan.mode].desc}), 교양 ${lib}학점(${admissionOf(state.profile)}학번 기준), 자유선택 ${GRAD.free}학점`,
      `• 비교과포인트 ${GRAD.extraPoints}pt (미충족 시 수료 처리)`,
      `• 트랙별 졸업요건(캡스톤·졸업작품 등)은 각 트랙 홈페이지에서 확인`,
      `지금 체크 기준: ${majorProgress}, 교양 ${pr.liberal}/${lib}학점.`,
    ].join("\n");
  }

  const course = findCourse(q);
  if (course) {
    const offers = COURSE_INDEX.get(course)!;
    const own = offers.filter((o) => mine.some((t) => t.name === o.track));
    const others = offers.filter((o) => !own.includes(o));
    const inPlan = rm.flatMap((sem, k) => sem.filter((it) => it.name === course).map((it) => ({ k, it })));
    return [
      `'${course}' 개설 정보예요 (공식 교육과정 기준).`,
      ...own.map((o) => `• ${o.track}: ${o.term} ${REQ_NAME[o.req]}`),
      ...(others.length ? [`• 다른 트랙 ${others.length}곳에서도 열려요: ${others.slice(0, 4).map((o) => `${o.track}(${o.term})`).join(", ")}${others.length > 4 ? " 등" : ""}`] : []),
      inPlan.length
        ? `내 로드맵에는 ${inPlan.map(({ k, it }) => `${SEM_NAMES[k]}${state.checks[it.id] ? "(이수)" : ""}`).join(", ")}에 들어 있어요.`
        : own.length
          ? "내 로드맵에는 아직 없어요. 전공선택이라 다른 과목 대신 넣어도 돼요."
          : "내 전공 교육과정에는 없는 과목이에요.",
    ].join("\n");
  }

  if (/캡스톤|졸업작품|종합설계|졸업논문/.test(q)) {
    const caps = mine.flatMap((t) => t.courses.filter((x) => /캡스톤|종합설계|졸업|포트폴리오|프로젝트/.test(x.name) && x.req !== "선").map((x) => `• ${t.name}: ${x.name} (${x.term} ${REQ_NAME[x.req]})`));
    const opt = mine.flatMap((t) => t.courses.filter((x) => /캡스톤|종합설계/.test(x.name) && x.req === "선").map((x) => `${x.name}(${x.term})`));
    return [
      caps.length ? "내 전공의 필수 캡스톤·졸업 과목이에요." : "내 전공에는 전공필수로 지정된 캡스톤 과목이 없어요.",
      ...caps,
      ...(opt.length ? [`전공선택 캡스톤: ${opt.slice(0, 5).join(", ")}${opt.length > 5 ? " 등" : ""}`] : []),
      "트랙별 졸업요건(졸업작품·논문 등)은 각 트랙 홈페이지에서 한 번 더 확인하세요.",
    ].join("\n");
  }

  if (/토익|toeic|오픽|opic|어학 ?성적|영어 ?점수|어학 ?점수/i.test(q)) {
    const eng = (ctx.recs ?? []).filter((r) => r.themes.includes("english")).slice(0, 3);
    return [
      "학교 공통 졸업요건(교과 130학점, 비교과 800pt)에는 어학 성적 기준이 없어요. 다만 트랙별 졸업요건에 따로 있을 수 있으니 내 트랙 홈페이지의 '트랙졸업요건'을 확인하세요.",
      ...(eng.length ? ["영어 실력을 키우는 교내 비교과:", ...eng.map((r) => `• ${r.p.t} (${r.p.p ? r.p.p + "pt" : "포인트 공지 확인"})`)] : []),
    ].join("\n");
  }

  if (/학점|얼마나 들었|진행/.test(q)) {
    return `체크한 항목 기준으로 ${majorProgress}, 교양 ${pr.liberal}학점, 비교과 ${pr.extraPts}/${GRAD.extraPoints}pt예요.`;
  }

  if (/휴학|복학|편입|전과|성적|장학/.test(q)) {
    return "휴학·복학·장학 같은 학사 규정은 이 앱 데이터에 없어요. 학사운영팀 공지나 종합정보시스템에서 확인하세요. 트랙 선택·변경, 졸업요건, 학기당 수강 학점, 재수강, 비교과, 과목 개설 학기는 여기서 물어볼 수 있어요.";
  }

  if (/2027|개편|이름/.test(q)) {
    const r = mine.filter((t) => t.rename2027 || COLLEGES[t.college].rename2027);
    return r.length
      ? r.map((t) => `• ${t.name}: ${t.rename2027 ? `→ ${t.rename2027}` : ""}${COLLEGES[t.college].rename2027 ? ` (단과대학 ${COLLEGES[t.college].name} → ${COLLEGES[t.college].rename2027})` : ""}`).join("\n")
      : "선택한 전공은 2027학년도 개편 명칭 변경 대상이 아니에요.";
  }

  return [
    "질문을 이해하지 못했어요. 이렇게 물어볼 수 있어요.",
    "• 과목: \"자료구조 몇 학기에 들어?\", \"캡스톤디자인 언제 들어?\"",
    "• 트랙: \"왜 이 조합을 추천했어?\", \"빅데이터트랙으로 바꾸면?\", \"1트랙은 어디서 골라야 해?\", \"2트랙 안 해도 돼?\"",
    "• 졸업·비교과: \"졸업하려면 뭐가 필요해?\", \"비교과 포인트 얼마나 남았어?\", \"영어 관련 비교과 추천해줘\"",
    "• 계획: \"이번 학기에 뭐 해야 해?\", \"지금까지 몇 학점 들었어?\", \"한 학기에 몇 학점까지 들어?\"",
  ].join("\n");
}

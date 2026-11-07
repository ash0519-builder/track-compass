import { test } from "node:test";
import assert from "node:assert/strict";
import { GRAD } from "../data/rules";
import { ENTRIES, findTrack, TRACKS } from "../data/tracks";
import type { AppState, Profile } from "../types";
import { answer } from "./advisor";
import { buildRoadmap, checksBefore, normalizeChecks, nowIndex, planTrack, progress, semesterCredits, trackCredits } from "./roadmap";
import { sanitizeState } from "./storage";
import { planOf, planParts, planTracks, resolvePlan } from "./plan";
import { cleanProgramName, recommendPrograms } from "./programs";
import { combos, firstCandidates, fit, overlap } from "./scoring";

const P: Profile = {
  entry: "상상력인재학부",
  day: "주간",
  year: 1,
  sem: 2,
  interests: ["데이터·AI", "경영·마케팅", "콘텐츠·미디어"],
  jobs: ["데이터분석가", "마케터"],
  strengths: ["분석·조사", "창의·표현"],
};

test("44개 트랙·학과, 이름 중복 없음, 모두 교육과정 데이터가 있다", () => {
  assert.equal(TRACKS.length, 44);
  assert.equal(new Set(TRACKS.map((t) => t.name)).size, TRACKS.length);
  for (const t of TRACKS) {
    assert.ok(t.courses.length >= 9, `${t.name} 과목 수 ${t.courses.length}`);
    assert.ok(t.courses.some((c) => c.req === "기"), `${t.name} 전공기초 없음`);
    for (const c of t.courses) assert.ok(c.name && c.sem >= 0 && c.sem <= 7, `${t.name}: ${c.term} ${c.name}`);
  }
});

test("모든 비자율 모집단위는 제1트랙 후보가 있다", () => {
  for (const e of ENTRIES) {
    for (const day of e.days) {
      const cands = firstCandidates({ ...P, entry: e.id, day });
      assert.ok(cands.length > 0, `${e.id} ${day}`);
      if (!e.free) for (const t of cands) assert.equal(t.school, e.id);
    }
  }
});

test("overlap은 0~1 사이이고, 빈 선택이면 0", () => {
  assert.equal(overlap([], ["a"]), 0);
  assert.equal(overlap(["a", "b"], ["a"]), 1);
  assert.equal(overlap(["a", "b"], ["a", "c"]), 0.5);
});

test("적합도 가중치: 관심 0.5 + 직무 0.3 + 강점 0.2", () => {
  const t = findTrack("비즈니스애널리틱스트랙")!;
  assert.equal(Math.round(fit(t, P) * 100), 90);
});

test("사회과학부 입학생의 제1트랙은 사회과학부 트랙", () => {
  const list = combos({ ...P, entry: "사회과학부" });
  for (const c of list) assert.equal(c.a.school, "사회과학부");
});

test("ICT디자인학부 야간 입학생의 제1트랙은 게임그래픽디자인트랙뿐", () => {
  const cands = firstCandidates({ ...P, entry: "ICT디자인학부", day: "야간" });
  assert.deepEqual(cands.map((t) => t.name), ["게임그래픽디자인트랙"]);
});

test("창업트랙은 제1트랙이 될 수 없다", () => {
  for (const c of combos(P)) assert.notEqual(c.a.name, "창업트랙");
});

test("로드맵: 트랙당 39학점 이상 계획(공개 과목이 부족한 트랙 제외)", () => {
  const c = combos(P)[0];
  const rm = buildRoadmap(planOf(c), P);
  assert.equal(rm.length, 8);
  assert.ok(trackCredits(rm, "a") >= GRAD.perTrack);
  assert.ok(trackCredits(rm, "b") >= GRAD.perTrack);
});

test("같은 전공기초를 가진 두 트랙은 학점을 한 번만 센다", () => {
  const a = findTrack("모바일소프트웨어트랙")!;
  const b = findTrack("빅데이터트랙")!;
  const taken = new Set<string>();
  planTrack(a, taken, 0).items.forEach((i) => taken.add(i.course.name));
  const pb = planTrack(b, taken, 1);
  const basic = pb.items.find((i) => i.course.req === "기")!;
  assert.equal(basic.shared, true);
  assert.ok(pb.credits >= GRAD.perTrack);
});

test("진행률과 상담 응답", () => {
  const list = combos(P);
  const c = list[0];
  const rm = buildRoadmap(planOf(c), P);
  const state: AppState = { profile: P, pick: [c.a.name, c.b.name], checks: checksBefore(rm, nowIndex(P)), myPoints: null, sample: true };
  const pr = progress(rm, state.checks, null);
  assert.ok(pr.a > 0 && pr.liberal > 0);
  const ctx = { state, plan: planOf(c), top: list.slice(0, 3), roadmap: rm };
  assert.match(answer("빅데이터트랙으로 바꾸면 어떻게 돼?", ctx), /빅데이터트랙을 넣어/);
  assert.match(answer("졸업하려면 뭐가 필요해?", ctx), /130학점/);
  assert.match(answer("비교과 포인트 얼마나 남았어?", { ...ctx, state: { ...state, myPoints: 300 } }), /300pt, 졸업까지 500pt/);
});

test("비교과 추천: 영어를 고르면 영어·외국어 프로그램이 상위에 온다", async () => {
  const { recommendPrograms } = await import("./programs");
  const p: Profile = { ...P, extraThemes: ["english"] };
  const recs = recommendPrograms(p, planTracks(planOf(combos(p)[0])));
  const top10 = recs.slice(0, 10);
  assert.ok(top10.filter((r) => r.themes.includes("english")).length >= 5, top10.map((r) => r.p.t).join(" / "));
});

test("비교과 추천: 담은 프로그램과 추천 프로그램이 로드맵에 들어간다", async () => {
  const { recommendPrograms } = await import("./programs");
  const c = combos(P)[0];
  const recs = recommendPrograms(P, [c.a, c.b]);
  const pickId = recs[0].p.id;
  const rm = buildRoadmap(planOf(c), P, { picks: { [String(pickId)]: 4 }, recs, now: 1 });
  assert.ok(rm[4].some((it) => it.programId === pickId && !it.auto));
  assert.ok(rm[2].some((it) => it.auto));
  assert.ok(!rm[0].some((it) => it.auto));
  const ids = rm.flat().filter((it) => it.programId).map((it) => it.programId);
  assert.equal(new Set(ids).size, ids.length);
});

test("상담: 영어 비교과 질문에 프로그램을 답한다", async () => {
  const { recommendPrograms } = await import("./programs");
  const c = combos(P)[0];
  const recs = recommendPrograms(P, [c.a, c.b]);
  const rm = buildRoadmap(planOf(c), P);
  const state: AppState = { profile: P, pick: [c.a.name, c.b.name], checks: {}, myPoints: null, sample: true };
  const out = answer("영어 관련 비교과 추천해줘", { state, plan: planOf(c), top: [c], roadmap: rm, recs });
  assert.match(out, /영어·외국어/);
  assert.match(answer("왜 이 조합을 추천했어?", { state, plan: planOf(c), top: [c], roadmap: rm, recs }), /지금 조합은/);
});

test("모든 조합·학번에서 기본 로드맵은 학기당 18학점을 넘지 않고, id가 겹치지 않는다", () => {
  for (const admission of [2026, 2024, 2020, 2016]) {
    for (const a of TRACKS) {
      for (const b of TRACKS.filter((t, k) => t !== a && k % 3 === 0)) {
        const rm = buildRoadmap(planOf({ a, b } as never), { ...P, admission });
        const loads = rm.map(semesterCredits);
        assert.ok(Math.max(...loads) <= GRAD.semesterMax, `${admission} ${a.name}+${b.name} ${loads.join(",")}`);
        const ids = rm.flat().map((it) => it.id);
        assert.equal(new Set(ids).size, ids.length, `${a.name}+${b.name} id 중복`);
        // 전공기초는 옮기지 않는다
        for (const it of rm.flat()) if (it.req === "기") assert.equal(it.movedFrom, undefined, `${it.name} 전공기초가 옮겨짐`);
      }
    }
  }
});

test("지난 학기를 하나도 체크하지 않으면 다시 넣지 않고, 체크를 시작하면 미이수 필수만 다시 넣는다", () => {
  const p: Profile = { ...P, year: 3, sem: 1, admission: 2024 };
  const c = combos(p)[0];
  const now = nowIndex(p);
  const none = buildRoadmap(planOf(c), p, { now, checks: {} });
  assert.equal(none.flat().filter((it) => it.carryOf).length, 0);
  const base = buildRoadmap(planOf(c), p);
  const all = checksBefore(base, now);
  const req = base.slice(0, now).flat().filter((it) => (it.kind === "a" || it.kind === "b") && it.req === "필" && it.unit > 0);
  const miss = req[req.length - 1];
  const checks = { ...all };
  delete checks[miss.id];
  const rm = buildRoadmap(planOf(c), p, { now, checks });
  const carried = rm.flatMap((sem, k) => sem.filter((it) => it.carryOf).map((it) => ({ it, k })));
  assert.equal(carried.length, 1);
  assert.equal(carried[0].it.carryOf, miss.id);
  const origSem = base.findIndex((sem) => sem.some((it) => it.id === miss.id));
  assert.ok(carried[0].k >= now && carried[0].k % 2 === origSem % 2, `다시 넣은 학기 ${carried[0].k}`);
  assert.ok(Math.max(...rm.map(semesterCredits).slice(now)) <= GRAD.semesterMaxCarry);
});

test("예전 체크 id(학기 번호 포함)를 지금 id로 바꾼다", () => {
  const out = normalizeChecks({ "s2:a:자료구조": true, "carry:s3:b:운영체제": true, "s1:g:교양 7학점": true, "x:HSP": true });
  assert.deepEqual(Object.keys(out).sort(), ["a:자료구조", "carry:b:운영체제", "g:교양 2 (7학점)", "x:HSP"].sort());
});

test("불러온 상태를 다듬는다 (잘못된 학년·주야·태그 개수)", () => {
  assert.equal(sanitizeState({ profile: { entry: "없는학부", day: "주간" } }), null);
  const s = sanitizeState({
    profile: { entry: "상상력인재학부", day: "야간", year: 9, sem: 5, interests: ["a", "b", "c", "d", "e", 3], jobs: [], strengths: [], admission: 1999 },
    pick: ["x"],
    checks: { "s0:g:사고와 표현": true },
    myPoints: -5,
  })!;
  assert.equal(s.profile.day, "주간");
  assert.equal(s.profile.year, 4);
  assert.equal(s.profile.sem, 2);
  assert.equal(s.profile.interests.length, 4);
  assert.equal(s.profile.admission, undefined);
  assert.equal(s.pick, null);
  assert.equal(s.myPoints, 0);
  assert.ok(s.checks["g:사고와 표현"]);
});

test("상담: 학기당 학점·재수강 질문에 답한다", () => {
  const state: AppState = { profile: P, pick: null, checks: {}, myPoints: null, sample: false };
  const top = combos(P);
  const ctx = { state, plan: planOf(top[0]), top: top.slice(0, 3), roadmap: buildRoadmap(planOf(top[0]), P) };
  assert.match(answer("한 학기에 몇 학점까지 들어?", ctx), /18학점/);
  assert.match(answer("재수강 규정 알려줘", ctx), /12학점/);
  assert.doesNotMatch(answer("비교과 포인트 학기당 얼마나 인정돼?", ctx), /수강신청은/);
});

test("비교과 프로그램 이름에서 운영 시기 표기를 깔끔하게 뺀다", () => {
  const cases: [string, string][] = [
    ["2026년 하계학기 한성현장실습(국내)", "한성현장실습(국내)"],
    ["2026-하계방학 SW중심대학사업단 표준현장실습", "SW중심대학사업단 표준현장실습"],
    ["2026-2) 기초학문 가치확산 프로그램", "기초학문 가치확산 프로그램"],
    ["2026년도 사회과학대학 연합 MT", "사회과학대학 연합 MT"],
    ["2026학년도 2학기 학습컨설팅 학습컨설팅 2차 외 1건", "학습컨설팅 2차 외 1건"],
    ["[대플]26-2학기 패스트파이브 채용(기업)설명회", "패스트파이브 채용(기업)설명회"],
    ["2026-2 제 19회 한성 교내 영어 스피치 대회", "제 19회 한성 교내 영어 스피치 대회"],
    ["제 12회 Global Culture Competition 제12회 Global Culture Competition 개인 지원 외 1건", "제12회 Global Culture Competition 개인 지원 외 1건"],
  ];
  for (const [raw, want] of cases) assert.equal(cleanProgramName(raw), want);
});

test("자동 추천 비교과는 같은 이름을 두 번 넣지 않는다", () => {
  for (const p of [P, { ...P, entry: "컴퓨터공학부", interests: ["프로그래밍"], jobs: ["개발자"] }] as Profile[]) {
    const c = combos(p)[0];
    const rm = buildRoadmap(planOf(c), p, { recs: recommendPrograms(p, [c.a, c.b]), now: nowIndex(p) });
    const names = rm.flat().filter((it) => it.auto).map((it) => it.name);
    assert.equal(new Set(names).size, names.length, names.join(" / "));
  }
});

const SEC: Profile = { ...P, entry: "융합보안학과", year: 2, sem: 1, admission: 2025, interests: ["보안"], jobs: ["보안전문가"], strengths: [] };
const CSE: Profile = { ...P, entry: "컴퓨터공학부", year: 2, sem: 1, admission: 2025, interests: ["프로그래밍"], jobs: ["개발자"], strengths: [] };

test("제2트랙 없이: 학과는 심화전공·부전공을 고를 수 있고, 트랙제 입학생은 '미정'만 가능하다", () => {
  const top = combos(SEC)[0];
  const deep = resolvePlan(SEC, ["융합보안학과", null], "deep", top);
  assert.equal(deep.mode, "deep");
  assert.equal(deep.b, null);
  const minor = resolvePlan(SEC, ["융합보안학과", "웹공학트랙"], "fusion2", top);
  assert.equal(minor.mode, "fusion2");
  assert.equal(minor.b?.name, "웹공학트랙");
  const cseTop = combos(CSE)[0];
  assert.equal(resolvePlan(CSE, [cseTop.a.name, null], "deep", cseTop).mode, "fusion1", "트랙제 입학생 심화전공은 허용 안 함");
  assert.equal(resolvePlan(CSE, [cseTop.a.name, null], "fusion2", cseTop).mode, "fusion1");
  const und = resolvePlan(CSE, [cseTop.a.name, null], "undecided", cseTop);
  assert.equal(und.mode, "undecided");
  assert.equal(und.b, null);
  // 제2트랙이 필요한 방식인데 제2트랙이 없으면 추천 1순위로
  assert.equal(resolvePlan(CSE, [cseTop.a.name, null], "fusion1", cseTop).b?.name, cseTop.b.name);
});

test("심화전공 로드맵: 학과 하나로 78학점, 창의융합대학 학과는 전공필수 21학점 기준", () => {
  const plan = resolvePlan(SEC, ["융합보안학과", null], "deep", combos(SEC)[0]);
  const rm = buildRoadmap(plan, SEC);
  assert.ok(trackCredits(rm, "a") >= 78, `계획 ${trackCredits(rm, "a")}학점`);
  assert.equal(rm.flat().filter((it) => it.kind === "b").length, 0);
  assert.equal(planParts(plan)[0].spec.req, 21);
  assert.ok(Math.max(...rm.map(semesterCredits)) <= GRAD.semesterMax);
  assert.ok(rm[1].some((it) => it.kind === "m" && it.name.includes("심화전공")));
});

test("융합전공Ⅱ 로드맵: 학과 57학점 + 부전공 21학점(전공필수 12학점 이상)", () => {
  for (const b of TRACKS.filter((t) => t.name !== "AI응용학과")) {
    const p: Profile = { ...SEC, entry: "AI응용학과" };
    const plan = resolvePlan(p, ["AI응용학과", b.name], "fusion2", combos(p)[0]);
    assert.equal(plan.mode, "fusion2", b.name);
    const rm = buildRoadmap(plan, p);
    assert.ok(trackCredits(rm, "a") >= 57, `학과 ${trackCredits(rm, "a")}`);
    const minor = rm.flat().filter((it) => it.kind === "b");
    const minorCredits = minor.reduce((s, it) => s + it.unit, 0);
    assert.ok(minorCredits >= 21 || minor.some((it) => it.unit === 0), `${b.name} 부전공 ${minorCredits}`);
    const req = minor.filter((it) => it.req === "필").reduce((s, it) => s + it.unit, 0);
    const avail = b.courses.filter((c) => c.req === "필").reduce((s, c) => s + c.credit, 0);
    assert.ok(req >= Math.min(12, avail), `${b.name} 부전공 필수 ${req}`);
    assert.ok(minor.every((it) => it.sub.includes("부전공")));
    assert.ok(Math.max(...rm.map(semesterCredits)) <= GRAD.semesterMax, `${b.name} ${rm.map(semesterCredits).join(",")}`);
  }
});

test("제2트랙 미정 로드맵: 제1트랙 39학점만 넣고 '제2트랙 정하기'를 이번 학기에 넣는다", () => {
  const top = combos(CSE)[0];
  const plan = resolvePlan(CSE, [top.a.name, null], "undecided", top);
  const now = nowIndex(CSE);
  const rm = buildRoadmap(plan, CSE, { now });
  assert.equal(rm.flat().filter((it) => it.kind === "b").length, 0);
  assert.ok(trackCredits(rm, "a") >= 39);
  assert.ok(rm[now].some((it) => it.kind === "m" && it.name === "제2트랙 정하기" && it.sub.includes("필수")));
});

test("상담: 제2트랙을 안 하는 경우를 학과·트랙제 입학생에 맞게 안내한다", () => {
  const mk = (p: Profile, plan: ReturnType<typeof resolvePlan>) => {
    const state: AppState = { profile: p, pick: [plan.a.name, plan.b?.name ?? null], mode: plan.mode, checks: {}, myPoints: null, sample: false };
    return { state, plan, top: combos(p).slice(0, 3), roadmap: buildRoadmap(plan, p) };
  };
  const cse = mk(CSE, planOf(combos(CSE)[0]));
  assert.match(answer("2트랙 안 해도 돼?", cse), /모두 골라야/);
  const deep = mk(SEC, resolvePlan(SEC, ["융합보안학과", null], "deep", combos(SEC)[0]));
  assert.match(answer("2트랙 안 해도 돼?", deep), /심화전공/);
  assert.match(answer("왜 이 조합을 추천했어?", deep), /지금 계획은 융합보안학과 심화전공/);
  assert.match(answer("웹공학트랙으로 바꾸면 어떻게 돼?", deep), /제2트랙으로 넣으면/);
  assert.match(answer("졸업하려면 뭐가 필요해?", deep), /심화전공 \d+\/78학점/);
});

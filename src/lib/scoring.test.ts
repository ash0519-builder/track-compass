import { test } from "node:test";
import assert from "node:assert/strict";
import { GRAD } from "../data/rules";
import { ENTRIES, findTrack, TRACKS } from "../data/tracks";
import type { AppState, Profile } from "../types";
import { answer } from "./advisor";
import { buildRoadmap, checksBefore, normalizeChecks, nowIndex, planTrack, progress, semesterCredits, trackCredits } from "./roadmap";
import { sanitizeState } from "./storage";
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
  const rm = buildRoadmap(c, P);
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
  const rm = buildRoadmap(c, P);
  const state: AppState = { profile: P, pick: [c.a.name, c.b.name], checks: checksBefore(rm, nowIndex(P)), myPoints: null, sample: true };
  const pr = progress(rm, state.checks, null);
  assert.ok(pr.a > 0 && pr.liberal > 0);
  const ctx = { state, pick: c, top: list.slice(0, 3), roadmap: rm };
  assert.match(answer("빅데이터트랙으로 바꾸면 어떻게 돼?", ctx), /빅데이터트랙을 넣어/);
  assert.match(answer("졸업하려면 뭐가 필요해?", ctx), /130학점/);
  assert.match(answer("비교과 포인트 얼마나 남았어?", { ...ctx, state: { ...state, myPoints: 300 } }), /300pt, 졸업까지 500pt/);
});

test("비교과 추천: 영어를 고르면 영어·외국어 프로그램이 상위에 온다", async () => {
  const { recommendPrograms } = await import("./programs");
  const p: Profile = { ...P, extraThemes: ["english"] };
  const recs = recommendPrograms(p, combos(p)[0]);
  const top10 = recs.slice(0, 10);
  assert.ok(top10.filter((r) => r.themes.includes("english")).length >= 5, top10.map((r) => r.p.t).join(" / "));
});

test("비교과 추천: 담은 프로그램과 추천 프로그램이 로드맵에 들어간다", async () => {
  const { recommendPrograms } = await import("./programs");
  const c = combos(P)[0];
  const recs = recommendPrograms(P, c);
  const pickId = recs[0].p.id;
  const rm = buildRoadmap(c, P, { picks: { [String(pickId)]: 4 }, recs, now: 1 });
  assert.ok(rm[4].some((it) => it.programId === pickId && !it.auto));
  assert.ok(rm[2].some((it) => it.auto));
  assert.ok(!rm[0].some((it) => it.auto));
  const ids = rm.flat().filter((it) => it.programId).map((it) => it.programId);
  assert.equal(new Set(ids).size, ids.length);
});

test("상담: 영어 비교과 질문에 프로그램을 답한다", async () => {
  const { recommendPrograms } = await import("./programs");
  const c = combos(P)[0];
  const recs = recommendPrograms(P, c);
  const rm = buildRoadmap(c, P);
  const state: AppState = { profile: P, pick: [c.a.name, c.b.name], checks: {}, myPoints: null, sample: true };
  const out = answer("영어 관련 비교과 추천해줘", { state, pick: c, top: [c], roadmap: rm, recs });
  assert.match(out, /영어·외국어/);
  assert.match(answer("왜 이 조합을 추천했어?", { state, pick: c, top: [c], roadmap: rm, recs }), /지금 조합은/);
});

test("모든 조합·학번에서 기본 로드맵은 학기당 18학점을 넘지 않고, id가 겹치지 않는다", () => {
  for (const admission of [2026, 2024, 2020, 2016]) {
    for (const a of TRACKS) {
      for (const b of TRACKS.filter((t, k) => t !== a && k % 3 === 0)) {
        const rm = buildRoadmap({ a, b } as never, { ...P, admission });
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
  const none = buildRoadmap(c, p, { now, checks: {} });
  assert.equal(none.flat().filter((it) => it.carryOf).length, 0);
  const base = buildRoadmap(c, p);
  const all = checksBefore(base, now);
  const req = base.slice(0, now).flat().filter((it) => (it.kind === "a" || it.kind === "b") && it.req === "필" && it.unit > 0);
  const miss = req[req.length - 1];
  const checks = { ...all };
  delete checks[miss.id];
  const rm = buildRoadmap(c, p, { now, checks });
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
  const ctx = { state, pick: top[0], top: top.slice(0, 3), roadmap: buildRoadmap(top[0], P) };
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
    const rm = buildRoadmap(c, p, { recs: recommendPrograms(p, c), now: nowIndex(p) });
    const names = rm.flat().filter((it) => it.auto).map((it) => it.name);
    assert.equal(new Set(names).size, names.length, names.join(" / "));
  }
});

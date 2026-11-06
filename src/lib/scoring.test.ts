import { test } from "node:test";
import assert from "node:assert/strict";
import { GRAD } from "../data/rules";
import { ENTRIES, findTrack, TRACKS } from "../data/tracks";
import type { AppState, Profile } from "../types";
import { answer } from "./advisor";
import { buildRoadmap, checksBefore, nowIndex, planTrack, progress, trackCredits } from "./roadmap";
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

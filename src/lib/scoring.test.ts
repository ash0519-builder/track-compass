import { test } from "node:test";
import assert from "node:assert/strict";
import { TRACKS } from "../data/tracks";
import type { AppState, Profile } from "../types";
import { answer } from "./advisor";
import { buildRoadmap, checksBefore, nowIndex, progress } from "./roadmap";
import { combos, findTrack, fit, overlap } from "./scoring";

const P: Profile = {
  entry: "FREE",
  year: 1,
  sem: 2,
  interests: ["데이터·AI", "경영·마케팅", "콘텐츠·미디어"],
  jobs: ["데이터분석가", "마케터"],
  strengths: ["분석·조사", "창의·표현"],
};

test("트랙 이름은 중복되지 않는다", () => {
  assert.equal(new Set(TRACKS.map((t) => t.name)).size, TRACKS.length);
});

test("overlap은 0~1 사이이고, 빈 선택이면 0", () => {
  assert.equal(overlap([], ["a"]), 0);
  assert.equal(overlap(["a", "b"], ["a"]), 1);
  assert.equal(overlap(["a", "b"], ["a", "c"]), 0.5);
});

test("적합도 가중치: 관심 0.5 + 직무 0.3 + 강점 0.2", () => {
  const t = findTrack("비즈니스애널리틱스트랙")!;
  // 관심 2/2=1, 직무 2/2=1, 강점 1/2=0.5
  assert.equal(Math.round(fit(t, P) * 100), 90);
});

test("유형 1은 1트랙 적합도가 2트랙 이상", () => {
  for (const c of combos(P).slice(0, 50)) assert.ok(c.sa >= c.sb);
});

test("유형 2는 1트랙이 입학 단과대학 안에 있다", () => {
  const p: Profile = { ...P, entry: "ENG" };
  const list = combos(p);
  assert.ok(list.length > 0);
  for (const c of list) assert.equal(c.a.col, "ENG");
});

test("다른 단과대학 조합에만 융합 가산 0.1", () => {
  for (const c of combos(P).slice(0, 30)) assert.equal(c.bonus, c.a.col !== c.b.col ? 0.1 : 0);
});

test("로드맵은 8학기, 진행률은 체크를 반영한다", () => {
  const c = combos(P)[0];
  const rm = buildRoadmap(c, P);
  assert.equal(rm.length, 8);
  const checks = checksBefore(rm, nowIndex(P));
  const pr = progress(rm, checks);
  assert.equal(pr.a.done, 1);
  assert.equal(pr.b.done, 1);
  assert.equal(pr.extraPts, 80);
});

test("상담: 트랙 변경 질문에 새 조합 점수를 답한다", () => {
  const list = combos(P);
  const c = list[0];
  const rm = buildRoadmap(c, P);
  const state: AppState = { profile: P, pick: [c.a.name, c.b.name], checks: checksBefore(rm, nowIndex(P)), sample: true };
  const ctx = { state, pick: c, top: list.slice(0, 3), roadmap: rm };
  const out = answer("빅데이터트랙으로 바꾸면 어떻게 돼?", ctx);
  assert.match(out, /빅데이터트랙을 넣어/);
  assert.match(out, /새 조합/);
  assert.match(answer("비교과 포인트 얼마나 남았어?", ctx), /720pt 남았어요/);
});

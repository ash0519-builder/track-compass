import { useEffect, useMemo, useState } from "react";
import { Chat } from "./components/Chat";
import { Diagnose } from "./components/Diagnose";
import { ExtraRoadmap } from "./components/ExtraRoadmap";
import { Recommend } from "./components/Recommend";
import { RoadmapView, type EditApi } from "./components/RoadmapView";
import { Rules } from "./components/Rules";
import { Summary } from "./components/Summary";
import { ENTRIES } from "./data/tracks";
import { planKey, planOf, planTracks, resolvePlan } from "./lib/plan";
import { buildRoadmap, checksBefore, nowIndex, outsideCredits, progress, transcriptChecks } from "./lib/roadmap";
import { recommendPrograms } from "./lib/programs";
import { combos } from "./lib/scoring";
import { clearState, loadState, sanitizeState, saveState } from "./lib/storage";
import type { AppState, Combo, Edits, MajorMode, Profile } from "./types";

const TABS = [
  { id: "diagnose", label: "진로·학습 진단" },
  { id: "recommend", label: "전공 추천" },
  { id: "roadmap", label: "교과 로드맵" },
  { id: "programs", label: "비교과 로드맵" },
  { id: "chat", label: "상담" },
  { id: "rules", label: "졸업요건·제도" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export const SAMPLE_PROFILE: Profile = {
  entry: "상상력인재학부",
  day: "주간",
  admission: 2026,
  year: 1,
  sem: 2,
  interests: ["데이터·AI", "경영·마케팅", "콘텐츠·미디어"],
  jobs: ["데이터분석가", "마케터"],
  strengths: ["분석·조사", "창의·표현"],
  extraThemes: ["english", "ai"],
  taken: [
    { name: "사고와 표현", grade: "A0" },
    { name: "영어커뮤니케이션(독해·작문)", grade: "B+" },
    { name: "AI와 SW 기초", grade: "A+" },
  ],
};

function sampleState(): AppState {
  const top = combos(SAMPLE_PROFILE)[0];
  return {
    profile: SAMPLE_PROFILE,
    pick: [top.a.name, top.b.name],
    mode: "fusion1",
    checks: checksBefore(buildRoadmap(planOf(top), SAMPLE_PROFILE), nowIndex(SAMPLE_PROFILE)),
    extraPicks: {},
    myPoints: null,
    sample: true,
  };
}

function initialState(): AppState {
  const s = loadState();
  if (s && ENTRIES.some((e) => e.id === s.profile.entry) && combos(s.profile).length) return s;
  return sampleState();
}

function readTab(): TabId {
  const h = window.location.hash.replace("#", "");
  return (TABS.some((t) => t.id === h) ? h : "recommend") as TabId;
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [tab, setTab] = useState<TabId>(readTab);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => saveState(state), [state]);

  const list = useMemo(() => combos(state.profile), [state.profile]);
  const top = list.slice(0, 3);
  const plan = useMemo(() => resolvePlan(state.profile, state.pick, state.mode, list[0]), [state.profile, state.pick, state.mode, list]);
  const now = nowIndex(state.profile);
  const recs = useMemo(() => recommendPrograms(state.profile, planTracks(plan)), [state.profile, plan]);
  const picks = useMemo(() => state.extraPicks ?? {}, [state.extraPicks]);
  const edits = useMemo(() => state.edits ?? {}, [state.edits]);
  const paths = useMemo(() => state.paths ?? {}, [state.paths]);
  // 학습 데이터(성적)로 이수한 과목은 자동 체크 (학생이 해제한 것은 제외)
  const base = useMemo(() => buildRoadmap(plan, state.profile, { picks, recs, now, edits, paths }), [plan, state.profile, picks, recs, now, edits, paths]);
  const auto = useMemo(() => transcriptChecks(base, state.profile.taken, state.offs), [base, state.profile.taken, state.offs]);
  const checks = useMemo(() => ({ ...auto, ...state.checks }), [auto, state.checks]);
  const roadmap = useMemo(
    () => buildRoadmap(plan, state.profile, { picks, recs, now, checks, edits, paths }),
    [plan, state.profile, picks, recs, now, checks, edits, paths],
  );
  const prog = progress(roadmap, checks, state.myPoints);
  const outside = outsideCredits(roadmap, state.profile.taken);
  const checkedPickPts = roadmap.flat().filter((it) => it.programId && picks[String(it.programId)] !== undefined && checks[it.id]).reduce((s, it) => s + it.unit, 0);

  const go = (t: TabId) => {
    window.location.hash = t;
  };

  function submitProfile(p: Profile) {
    // 이전에 고른 계획이 새 조건에서도 규칙에 맞으면 그대로 유지 (맞지 않으면 추천 1순위)
    const best = combos(p)[0];
    const next = state.sample ? planOf(best) : resolvePlan(p, state.pick, state.mode, best);
    setState({
      ...state,
      profile: p,
      pick: [next.a.name, next.b?.name ?? null],
      mode: next.mode,
      // 예시 데이터의 체크·담은 비교과는 버리고, 내 데이터는 유지 (지난 학기는 학생이 직접 체크)
      checks: state.sample ? {} : state.checks,
      extraPicks: state.sample ? {} : state.extraPicks,
      myPoints: state.sample ? null : state.myPoints,
      sample: false,
    });
    go("recommend");
  }

  function markPast() {
    setState({ ...state, checks: checksBefore(roadmap, now, state.checks), sample: false });
  }

  const setEdits = (next: Edits) => setState({ ...state, edits: next, sample: false });
  const api: EditApi = {
    edits,
    auto,
    paths,
    jobs: state.profile.jobs,
    onMove: (id, sem) => setEdits({ ...edits, moves: { ...edits.moves, [id]: sem } }),
    onUnmove: (id) => {
      const moves = { ...edits.moves };
      delete moves[id];
      setEdits({ ...edits, moves });
    },
    onSwap: (kind, from, to) => {
      const k = (n: string) => `${kind}:${n}`;
      setEdits({
        ...edits,
        drops: [...new Set([...(edits.drops ?? []).filter((x) => x !== k(to)), k(from)])],
        pins: [...new Set([...(edits.pins ?? []).filter((x) => x !== k(from)), k(to)])],
      });
    },
    onRename: (id, name) => {
      const renames = { ...edits.renames };
      if (name) renames[id] = name.slice(0, 40);
      else delete renames[id];
      setEdits({ ...edits, renames });
    },
    onAdd: (item) => setEdits({ ...edits, custom: [...(edits.custom ?? []), { ...item, id: `c:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` }].slice(-60) }),
    onRemove: (id) => setEdits({ ...edits, custom: (edits.custom ?? []).filter((c) => c.id !== id) }),
    onReset: () => {
      if (window.confirm("교과 로드맵에서 직접 옮기고 바꾸고 추가한 내용을 모두 되돌릴까요?")) setEdits({});
    },
    onPath: (track, label) => setState({ ...state, paths: { ...paths, [track]: label }, sample: false }),
  };

  function exportPlan() {
    const blob = new Blob([JSON.stringify({ app: "track-compass", version: 3, savedAt: new Date().toISOString(), state }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `트랙나침반_내계획_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importPlan(file: File) {
    file
      .text()
      .then((txt) => {
        const data = JSON.parse(txt);
        const s = data?.app === "track-compass" ? sanitizeState(data.state) : null;
        if (!s) throw new Error("형식");
        setState({ ...s, sample: false });
        window.alert("저장한 계획을 불러왔어요.");
      })
      .catch(() => window.alert("트랙 나침반에서 저장한 계획 파일(.json)만 불러올 수 있어요."));
  }

  function choose(c: Combo) {
    setState({ ...state, pick: [c.a.name, c.b.name], mode: "fusion1" });
    go("roadmap");
  }

  function choosePlan(a: string, b: string | null, mode: MajorMode) {
    setState({ ...state, pick: [a, b], mode });
    go("roadmap");
  }

  function toggle(id: string, on: boolean) {
    const next = { ...state.checks };
    const offs = { ...state.offs };
    if (on) {
      next[id] = true;
      delete offs[id];
    } else {
      delete next[id];
      if (auto[id]) offs[id] = true;
    }
    setState({ ...state, checks: next, offs, sample: false });
  }

  function reset() {
    if (!state.sample && !window.confirm("입력한 진단 결과, 체크, 담은 비교과가 모두 지워져요. 예시 데이터로 초기화할까요?")) return;
    clearState();
    setState(sampleState());
    go("recommend");
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            <h1>트랙 나침반</h1>
            <span>HSU 진로로드맵 e-Advisor</span>
          </div>
          <div className="header-actions">
            <span className="pill n">{state.sample ? "예시 학생 데이터" : "내 정보로 저장됨"}</span>
            <button type="button" className="link-btn" onClick={reset}>
              예시로 초기화
            </button>
          </div>
        </div>
      </header>

      <div className="wrap">
        <Summary plan={plan} profile={state.profile} prog={prog} roadmap={roadmap} outside={outside} />

        <nav className="tabs" aria-label="단계">
          {TABS.map((t, k) => (
            <a key={t.id} href={`#${t.id}`} aria-current={tab === t.id ? "page" : undefined}>
              <span className="num">{k + 1}</span>
              {t.label}
            </a>
          ))}
        </nav>

        <main>
          {tab === "diagnose" && <Diagnose key={JSON.stringify(state.profile) + state.sample} profile={state.profile} sample={state.sample} onSubmit={submitProfile} />}
          {tab === "recommend" && <Recommend profile={state.profile} top={top} plan={plan} onPick={choose} onPlan={choosePlan} />}
          {tab === "roadmap" && (
            <RoadmapView
              api={api}
              plan={plan}
              roadmap={roadmap}
              checks={checks}
              now={now}
              myPoints={state.myPoints}
              onToggle={toggle}
              onPoints={(v) => setState({ ...state, myPoints: v, sample: false })}
              onMarkPast={markPast}
              onExport={exportPlan}
              onImport={importPlan}
            />
          )}
          {tab === "programs" && (
            <ExtraRoadmap
              profile={state.profile}
              recs={recs}
              picks={picks}
              now={now}
              points={prog.extraPts}
              checkedPts={checkedPickPts}
              onPick={(id, sem) => setState({ ...state, extraPicks: { ...picks, [String(id)]: sem }, sample: false })}
              onUnpick={(id) => {
                const next = { ...picks };
                delete next[String(id)];
                setState({ ...state, extraPicks: next, sample: false });
              }}
              onThemes={(themes) => setState({ ...state, profile: { ...state.profile, extraThemes: themes }, sample: false })}
            />
          )}
          {tab === "chat" && <Chat key={planKey(plan)} ctx={{ state: { ...state, checks }, plan, top, roadmap, recs }} />}
          {tab === "rules" && <Rules />}

          <footer className="note">
            <p>
              <b>데이터 기준</b> 트랙·학과 목록과 교과목은 2026년 11월 한성대학교 각 트랙 홈페이지의 교육과정소개(일부는 교과목 로드맵)에서 가져왔어요. 예술학부와 글로벌인재대학은
              제외했어요. 졸업요건과 트랙 제도는 '졸업요건·제도' 탭의 공식 출처를 따릅니다.
            </p>
            <p>관심 분야·직무·강점 태그와 추천 점수는 참고용이에요. 최종 트랙 선택은 지도교수 상담 후 결정하세요. 입력한 내용은 이 브라우저에만 저장됩니다.</p>
          </footer>
        </main>
      </div>
    </>
  );
}

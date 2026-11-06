import { useEffect, useMemo, useState } from "react";
import { Chat } from "./components/Chat";
import { Diagnose } from "./components/Diagnose";
import { Programs } from "./components/Programs";
import { Recommend } from "./components/Recommend";
import { RoadmapView } from "./components/RoadmapView";
import { Rules } from "./components/Rules";
import { Summary } from "./components/Summary";
import { ENTRIES } from "./data/tracks";
import { buildRoadmap, checksBefore, nowIndex, progress } from "./lib/roadmap";
import { recommendPrograms } from "./lib/programs";
import { combos, validCombo } from "./lib/scoring";
import { clearState, loadState, sanitizeState, saveState } from "./lib/storage";
import type { AppState, Combo, Profile } from "./types";

const TABS = [
  { id: "diagnose", label: "진로 진단" },
  { id: "recommend", label: "트랙 추천" },
  { id: "roadmap", label: "학기별 로드맵" },
  { id: "programs", label: "비교과 추천" },
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
};

function sampleState(): AppState {
  const top = combos(SAMPLE_PROFILE)[0];
  return {
    profile: SAMPLE_PROFILE,
    pick: [top.a.name, top.b.name],
    checks: checksBefore(buildRoadmap(top, SAMPLE_PROFILE), nowIndex(SAMPLE_PROFILE)),
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
  const pick: Combo = (state.pick && validCombo(state.profile, state.pick[0], state.pick[1])) || top[0];
  const now = nowIndex(state.profile);
  const recs = useMemo(() => recommendPrograms(state.profile, pick), [state.profile, pick]);
  const picks = useMemo(() => state.extraPicks ?? {}, [state.extraPicks]);
  const roadmap = useMemo(
    () => buildRoadmap(pick, state.profile, { picks, recs, now, checks: state.checks }),
    [pick, state.profile, picks, recs, now, state.checks],
  );
  const prog = progress(roadmap, state.checks, state.myPoints);

  const go = (t: TabId) => {
    window.location.hash = t;
  };

  function submitProfile(p: Profile) {
    // 이전에 고른 조합이 새 조건에서도 규칙에 맞으면 그대로 유지
    const kept = state.pick && !state.sample ? validCombo(p, state.pick[0], state.pick[1]) : null;
    const next = kept ?? combos(p)[0];
    setState({
      ...state,
      profile: p,
      pick: [next.a.name, next.b.name],
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
    setState({ ...state, pick: [c.a.name, c.b.name] });
    go("roadmap");
  }

  function toggle(id: string, on: boolean) {
    const checks = { ...state.checks };
    if (on) checks[id] = true;
    else delete checks[id];
    setState({ ...state, checks, sample: false });
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
        <Summary pick={pick} profile={state.profile} prog={prog} roadmap={roadmap} />

        <nav className="tabs" aria-label="단계">
          {TABS.map((t, k) => (
            <a key={t.id} href={`#${t.id}`} aria-current={tab === t.id ? "page" : undefined}>
              <span className="num">{k + 1}</span>
              {t.label}
            </a>
          ))}
        </nav>

        <main>
          {tab === "diagnose" && <Diagnose key={JSON.stringify(state.profile)} profile={state.profile} onSubmit={submitProfile} />}
          {tab === "recommend" && <Recommend profile={state.profile} top={top} pick={pick} onPick={choose} />}
          {tab === "roadmap" && (
            <RoadmapView
              pick={pick}
              roadmap={roadmap}
              checks={state.checks}
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
            <Programs
              profile={state.profile}
              recs={recs}
              picks={picks}
              now={now}
              onPick={(id, sem) => setState({ ...state, extraPicks: { ...picks, [String(id)]: sem }, sample: false })}
              onUnpick={(id) => {
                const next = { ...picks };
                delete next[String(id)];
                setState({ ...state, extraPicks: next, sample: false });
              }}
              onThemes={(themes) => setState({ ...state, profile: { ...state.profile, extraThemes: themes }, sample: false })}
            />
          )}
          {tab === "chat" && <Chat key={pick.a.name + pick.b.name} ctx={{ state, pick, top, roadmap, recs }} />}
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

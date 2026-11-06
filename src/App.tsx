import { useEffect, useMemo, useState } from "react";
import { Chat } from "./components/Chat";
import { Diagnose } from "./components/Diagnose";
import { Recommend } from "./components/Recommend";
import { RoadmapView } from "./components/RoadmapView";
import { Rules } from "./components/Rules";
import { Summary } from "./components/Summary";
import { ENTRIES } from "./data/tracks";
import { buildRoadmap, checksBefore, nowIndex, progress } from "./lib/roadmap";
import { combos } from "./lib/scoring";
import { clearState, loadState, saveState } from "./lib/storage";
import type { AppState, Combo, Profile } from "./types";

const TABS = [
  { id: "diagnose", label: "진로 진단" },
  { id: "recommend", label: "트랙 추천" },
  { id: "roadmap", label: "학기별 로드맵" },
  { id: "chat", label: "상담" },
  { id: "rules", label: "졸업요건·제도" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export const SAMPLE_PROFILE: Profile = {
  entry: "상상력인재학부",
  day: "주간",
  year: 1,
  sem: 2,
  interests: ["데이터·AI", "경영·마케팅", "콘텐츠·미디어"],
  jobs: ["데이터분석가", "마케터"],
  strengths: ["분석·조사", "창의·표현"],
};

function sampleState(): AppState {
  const top = combos(SAMPLE_PROFILE)[0];
  return {
    profile: SAMPLE_PROFILE,
    pick: [top.a.name, top.b.name],
    checks: checksBefore(buildRoadmap(top, SAMPLE_PROFILE), nowIndex(SAMPLE_PROFILE)),
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
  const pick: Combo = (state.pick && list.find((c) => c.a.name === state.pick![0] && c.b.name === state.pick![1])) || top[0];
  const roadmap = useMemo(() => buildRoadmap(pick, state.profile), [pick, state.profile]);
  const prog = progress(roadmap, state.checks, state.myPoints);
  const now = nowIndex(state.profile);

  const go = (t: TabId) => {
    window.location.hash = t;
  };

  function submitProfile(p: Profile) {
    const first = combos(p)[0];
    const rm = buildRoadmap(first, p);
    const keepChecks = nowIndex(p) === now;
    setState({ ...state, profile: p, pick: [first.a.name, first.b.name], checks: keepChecks ? state.checks : checksBefore(rm, nowIndex(p)), sample: false });
    go("recommend");
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
        <Summary pick={pick} profile={state.profile} prog={prog} />

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
            />
          )}
          {tab === "chat" && <Chat key={pick.a.name + pick.b.name} ctx={{ state, pick, top, roadmap }} />}
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

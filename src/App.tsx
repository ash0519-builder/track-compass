import { useEffect, useMemo, useState } from "react";
import { Chat } from "./components/Chat";
import { Diagnose } from "./components/Diagnose";
import { Recommend } from "./components/Recommend";
import { RoadmapView } from "./components/RoadmapView";
import { Summary } from "./components/Summary";
import { buildRoadmap, checksBefore, nowIndex, progress } from "./lib/roadmap";
import { combos } from "./lib/scoring";
import { clearState, loadState, saveState } from "./lib/storage";
import type { AppState, Combo, Profile } from "./types";

const TABS = [
  { id: "diagnose", label: "진로 진단" },
  { id: "recommend", label: "트랙 추천" },
  { id: "roadmap", label: "학기별 로드맵" },
  { id: "chat", label: "AI 상담" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export const SAMPLE_PROFILE: Profile = {
  entry: "FREE",
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
    sample: true,
  };
}

function readTab(): TabId {
  const h = window.location.hash.replace("#", "");
  return (TABS.some((t) => t.id === h) ? h : "recommend") as TabId;
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState() ?? sampleState());
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
  const prog = progress(roadmap, state.checks);
  const now = nowIndex(state.profile);

  const go = (t: TabId) => {
    window.location.hash = t;
  };

  function submitProfile(p: Profile) {
    const first = combos(p)[0];
    const rm = buildRoadmap(first, p);
    const keepChecks = nowIndex(p) === now;
    setState({ profile: p, pick: [first.a.name, first.b.name], checks: keepChecks ? state.checks : checksBefore(rm, nowIndex(p)), sample: false });
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
          {tab === "roadmap" && <RoadmapView pick={pick} roadmap={roadmap} checks={state.checks} now={now} onToggle={toggle} />}
          {tab === "chat" && <Chat key={pick.a.name + pick.b.name} ctx={{ state, pick, top, roadmap }} />}

          <footer className="note">
            <p>
              <b>데이터 안내</b> 트랙 목록은 한성대 2026학년도 학부(과)·트랙 안내 기준입니다(실기 기반 예술학부 전공 제외). 디지털콘텐츠·가상현실트랙은 2027학년도 11월 트랙 선택부터
              지능형실감미디어공학트랙으로 이름이 바뀝니다.
            </p>
            <p>
              교과목과 비교과 포인트는 <b>예시</b>이며, 각 트랙의 교과목 로드맵·졸업요건과 연동할 예정입니다. HSP 100pt는 e-Advisor 공모전 공지 기준이고, 비교과 800pt 졸업요건은
              2016학년도 이후 입학자 안내 기준으로 현재 기준 확인이 필요합니다.
            </p>
            <p>추천은 참고용입니다. 최종 트랙 선택은 지도교수 상담 후 결정하세요. 입력한 내용은 이 브라우저에만 저장됩니다.</p>
          </footer>
        </main>
      </div>
    </>
  );
}

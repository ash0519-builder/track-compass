import { useState } from "react";
import { GRAD } from "../data/rules";
import { SEM_NAMES } from "../data/tracks";
import { trackCredits, unitText } from "../lib/roadmap";
import type { AppState, Combo, Roadmap, Track } from "../types";

function TrackSource({ t, credits, tone }: { t: Track; credits: number; tone: string }) {
  return (
    <div className="src-row">
      <span className={`pill ${tone}`}>{tone === "b" ? "2트랙" : "1트랙"}</span>
      <a href={t.source} target="_blank" rel="noreferrer">
        {t.name} 공식 교육과정
      </a>
      <span className={credits < GRAD.perTrack ? "warn" : "hint"}>
        계획 {credits}학점{credits < GRAD.perTrack ? ` (공개된 과목으로는 ${GRAD.perTrack}학점에 못 미쳐요, 트랙에 확인)` : ""}
      </span>
      {t.dataNote && <span className="hint">{t.dataNote}</span>}
    </div>
  );
}

export function RoadmapView({
  pick,
  roadmap,
  checks,
  now,
  myPoints,
  onToggle,
  onPoints,
}: {
  pick: Combo;
  roadmap: Roadmap;
  checks: AppState["checks"];
  now: number;
  myPoints: number | null;
  onToggle: (id: string, on: boolean) => void;
  onPoints: (v: number | null) => void;
}) {
  const [pts, setPts] = useState(myPoints === null ? "" : String(myPoints));
  return (
    <section className="panel" id="p-roadmap">
      <div className="panel-head">
        <div>
          <h2>
            {pick.a.name} + {pick.b.name} 로드맵
          </h2>
          <p>각 트랙 공식 교육과정에서 전공기초·전공필수를 모두 넣고, 전공선택으로 트랙당 {GRAD.perTrack}학점을 채웠어요. 완료한 항목을 체크하면 위쪽 진행률이 바뀝니다.</p>
        </div>
        <div className="legend">
          <span className="pill">1트랙</span>
          <span className="pill b">2트랙</span>
          <span className="pill g">교양</span>
          <span className="pill x">비교과</span>
        </div>
      </div>

      <div className="card sources">
        <TrackSource t={pick.a} credits={trackCredits(roadmap, "a")} tone="" />
        <TrackSource t={pick.b} credits={trackCredits(roadmap, "b")} tone="b" />
        <form
          className="points"
          onSubmit={(e) => {
            e.preventDefault();
            const v = pts.trim() === "" ? null : Math.max(0, Math.round(Number(pts)));
            onPoints(Number.isFinite(v as number) || v === null ? v : null);
          }}
        >
          <label htmlFor="myPoints">스마트자기관리시스템의 내 누적 비교과포인트</label>
          <input id="myPoints" inputMode="numeric" value={pts} onChange={(e) => setPts(e.target.value.replace(/[^0-9]/g, ""))} placeholder="예: 240" />
          <button className="btn ghost" type="submit">
            반영
          </button>
          <span className="hint">비워두면 아래에서 체크한 비교과 포인트로 계산해요.</span>
        </form>
      </div>

      <div className="sems">
        {roadmap.map((items, k) => {
          const credits = items.filter((it) => it.kind === "a" || it.kind === "b" || it.kind === "g").reduce((s, it) => s + it.unit, 0);
          const pts = items.filter((it) => it.kind === "x").reduce((s, it) => s + it.unit, 0);
          const allDone = items.every((it) => checks[it.id]);
          const state =
            k === now ? <span className="state now">이번 학기</span> : allDone ? <span className="state done">완료</span> : k < now ? <span className="state">미완료 있음</span> : <span className="state">예정</span>;
          return (
            <article key={k} className={`card sem${k === now ? " now" : k < now ? " past" : ""}`}>
              <div className="sem-head">
                <h3>{SEM_NAMES[k]}</h3>
                {state}
              </div>
              {items.map((it, j) => {
                const id = `it-${k}-${j}`;
                const on = !!checks[it.id];
                return (
                  <div key={it.id} className={`item ${it.kind}${on ? " checked" : ""}${it.req === "필" || it.req === "기" ? " req" : ""}`}>
                    <input type="checkbox" id={id} checked={on} onChange={(e) => onToggle(it.id, e.target.checked)} />
                    <label htmlFor={id}>
                      <span>{it.name}</span>
                      <small>{it.sub}</small>
                    </label>
                    <span className="u">{unitText(it)}</span>
                  </div>
                );
              })}
              <div className="sem-foot">
                <span>교과 {credits}학점</span>
                <span>비교과 {pts}pt</span>
              </div>
            </article>
          );
        })}
      </div>
      <p className="hint">
        과목의 학년·학기와 이수구분은 각 트랙 공식 교육과정 기준이고, 교양 과목의 학기 배치와 전공선택 과목 선택은 예시예요. 교양 외 자유선택 {GRAD.free}학점은 따로 채워야 해요.
      </p>
    </section>
  );
}

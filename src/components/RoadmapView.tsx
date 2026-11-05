import { SEM_NAMES } from "../data/tracks";
import { unitText } from "../lib/roadmap";
import type { AppState, Combo, Roadmap } from "../types";

export function RoadmapView({
  pick,
  roadmap,
  checks,
  now,
  onToggle,
}: {
  pick: Combo;
  roadmap: Roadmap;
  checks: AppState["checks"];
  now: number;
  onToggle: (id: string, on: boolean) => void;
}) {
  return (
    <section className="panel on" id="p-roadmap">
      <div className="panel-head">
        <div>
          <h2>
            {pick.a.name} + {pick.b.name} 로드맵
          </h2>
          <p>완료한 항목을 체크하면 위쪽 진행률이 바로 바뀝니다. 지금 학기는 파란 테두리로 표시돼요.</p>
        </div>
        <div className="legend">
          <span className="pill">1트랙</span>
          <span className="pill b">2트랙</span>
          <span className="pill n">교양·공통</span>
          <span className="pill x">비교과</span>
        </div>
      </div>

      <div className="sems">
        {roadmap.map((items, k) => {
          const credits = items.filter((it) => it.kind !== "x").reduce((s, it) => s + it.unit, 0);
          const pts = items.filter((it) => it.kind === "x").reduce((s, it) => s + it.unit, 0);
          const allDone = items.every((it) => checks[it.id]);
          const state =
            k === now ? (
              <span className="state now">이번 학기</span>
            ) : allDone ? (
              <span className="state done">완료</span>
            ) : k < now ? (
              <span className="state">미완료 있음</span>
            ) : (
              <span className="state">예정</span>
            );
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
                  <div key={it.id} className={`item ${it.kind === "n" ? "" : it.kind}${on ? " checked" : ""}`}>
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
    </section>
  );
}

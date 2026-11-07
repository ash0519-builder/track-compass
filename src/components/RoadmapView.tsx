import { useRef, useState } from "react";
import { GRAD, MODE_RULES } from "../data/rules";
import { SEM_NAMES } from "../data/tracks";
import { planParts, planTitle, type PlanPart } from "../lib/plan";
import { pastReviewed, pastUnchecked, semesterCredits, trackCredits, unitText } from "../lib/roadmap";
import type { AppState, Plan, Roadmap } from "../types";

function TrackSource({ part, roadmap }: { part: PlanPart; roadmap: Roadmap }) {
  const { t, spec, kind } = part;
  const credits = trackCredits(roadmap, kind);
  const req = roadmap
    .flat()
    .filter((it) => it.kind === kind && !it.carryOf && it.req === "필")
    .reduce((s, it) => s + it.unit, 0);
  return (
    <div className="src-row">
      <span className={`pill ${kind === "b" ? "b" : ""}`}>{spec.label}</span>
      <a href={t.source} target="_blank" rel="noreferrer">
        {t.name} 공식 교육과정
      </a>
      <span className={credits < spec.total ? "warn" : "hint"}>
        계획 {credits} / {spec.total}학점{credits < spec.total ? " (공개된 과목으로는 모자라요, 트랙·학과에 확인)" : ""}
      </span>
      {req < spec.req && <span className="warn">전공필수 {spec.req}학점 이상 필요 · 공개 교육과정 전공필수 {req}학점 (학과에 확인)</span>}
      {t.dataNote && <span className="hint">{t.dataNote}</span>}
    </div>
  );
}

const MODE_DESC: Record<Plan["mode"], string> = {
  fusion1: `각 트랙 공식 교육과정에서 전공기초·전공필수를 모두 넣고, 전공선택으로 트랙당 ${GRAD.perTrack}학점을 채웠어요.`,
  fusion2: `학과 교육과정으로 ${MODE_RULES.fusion2.a.total}학점(전공기초·전공필수 전부 + 전공선택), 부전공 트랙으로 ${MODE_RULES.fusion2.b!.total}학점(전공기초 + 전공필수 ${MODE_RULES.fusion2.b!.req}학점 + 전공선택)을 채웠어요.`,
  deep: `제2트랙 없이 학과 교육과정 하나로 ${MODE_RULES.deep.a.total}학점(전공기초·전공필수 전부 + 전공선택)을 채웠어요.`,
  undecided: `제2트랙을 정하기 전이라 제1트랙 ${GRAD.perTrack}학점만 넣었어요. 제2트랙을 정하면 ${GRAD.perTrack}학점이 더 들어가요.`,
};

export function RoadmapView({
  plan,
  roadmap,
  checks,
  now,
  myPoints,
  onToggle,
  onPoints,
  onMarkPast,
  onExport,
  onImport,
}: {
  plan: Plan;
  roadmap: Roadmap;
  checks: AppState["checks"];
  now: number;
  myPoints: number | null;
  onToggle: (id: string, on: boolean) => void;
  onPoints: (v: number | null) => void;
  onMarkPast: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const [pts, setPts] = useState(myPoints === null ? "" : String(myPoints));
  const fileRef = useRef<HTMLInputElement>(null);
  const unchecked = pastUnchecked(roadmap, now, checks);
  const carried = roadmap.flat().filter((it) => it.carryOf).length;
  const reviewed = pastReviewed(roadmap, now, checks);
  const overloaded = roadmap.slice(now).filter((items) => semesterCredits(items) > GRAD.semesterMaxCarry).length;

  return (
    <section className="panel" id="p-roadmap">
      <div className="panel-head">
        <div>
          <h2>{planTitle(plan)} 로드맵</h2>
          <p>{MODE_DESC[plan.mode]} 이수한 항목을 체크하면 위쪽 진행률이 바뀝니다.</p>
        </div>
        <div className="legend">
          {planParts(plan).map((x) => (
            <span key={x.kind} className={`pill ${x.kind === "b" ? "b" : ""}`}>
              {x.spec.label}
            </span>
          ))}
          <span className="pill g">교양</span>
          <span className="pill x">비교과</span>
          <span className="pill carry">다시 들을 과목</span>
        </div>
      </div>

      {now > 0 && unchecked > 0 && (
        <div className="card notice" role="status">
          {reviewed ? (
            <div>
              <b>지난 학기({SEM_NAMES[0]}~{SEM_NAMES[now - 1]})에 체크하지 않은 항목이 {unchecked}개 있어요.</b>
              <p className="hint">
                체크하지 않은 전공기초·전공필수·교양필수 {carried}개는 같은 학기(1학기/2학기)에 열리는 남은 학기에 '다시 들을 과목'으로 넣었어요. 전공선택·선택교양은 다른 과목으로 채워도 돼서 다시 넣지 않아요. 이미 들은 과목이면 체크해 주세요.
                {overloaded > 0 && ` 남은 학기 중 ${overloaded}개 학기가 ${GRAD.semesterMaxCarry}학점을 넘어요: 계절학기·초과학기를 검토하세요.`}
              </p>
            </div>
          ) : (
            <div>
              <b>지난 학기({SEM_NAMES[0]}~{SEM_NAMES[now - 1]})에 들은 과목을 표시해 주세요.</b>
              <p className="hint">
                들은 과목을 체크하거나 '지난 학기 모두 이수로 표시'를 눌러 한 번에 표시하세요. 체크를 시작하면 체크하지 않은 전공기초·전공필수·교양필수는 남은 학기에 '다시 들을 과목'으로 넣어 드려요.
              </p>
            </div>
          )}
          <button type="button" className="btn ghost" onClick={onMarkPast}>
            지난 학기 모두 이수로 표시
          </button>
        </div>
      )}

      <div className="card sources">
        {planParts(plan).map((x) => (
          <TrackSource key={x.kind} part={x} roadmap={roadmap} />
        ))}
        {plan.mode === "undecided" && (
          <div className="src-row">
            <span className="pill b">2트랙</span>
            <span>미정</span>
            <a href="#recommend">트랙 추천에서 제2트랙 고르기</a>
          </div>
        )}
        <form
          className="points"
          onSubmit={(e) => {
            e.preventDefault();
            onPoints(pts.trim() === "" ? null : Math.max(0, Math.round(Number(pts))));
          }}
        >
          <label htmlFor="myPoints">스마트자기관리시스템의 내 누적 비교과포인트</label>
          <input id="myPoints" inputMode="numeric" value={pts} onChange={(e) => setPts(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))} placeholder="예: 240" />
          <button className="btn ghost" type="submit">
            반영
          </button>
          <span className="hint">비워두면 아래에서 체크한 비교과 포인트로 계산해요.</span>
        </form>
        <div className="file-actions">
          <button type="button" className="btn ghost" onClick={() => window.print()}>
            인쇄·PDF로 저장
          </button>
          <button type="button" className="btn ghost" onClick={onExport}>
            내 계획 파일로 저장
          </button>
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            저장한 계획 불러오기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            id="importFile"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
            }}
          />
          <span className="hint">입력 내용은 이 브라우저에만 저장돼요. 다른 컴퓨터에서 이어 쓰려면 파일로 저장해 두세요.</span>
        </div>
      </div>

      <div className="sems">
        {roadmap.map((items, k) => {
          const credits = semesterCredits(items);
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
                const cls = [
                  "item",
                  it.kind,
                  on ? "checked" : "",
                  it.req === "필" || it.req === "기" ? "req" : "",
                  it.auto ? "auto" : "",
                  it.carryOf ? "carry" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div key={it.id} className={cls}>
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
                <span className={credits > GRAD.semesterMax ? "warn" : ""}>
                  교과 {credits}학점
                  {credits > GRAD.semesterMaxCarry
                    ? ` (${GRAD.semesterMaxCarry}학점 초과: 계절학기·초과학기 검토)`
                    : credits > GRAD.semesterMax
                      ? ` (기본 ${GRAD.semesterMax}학점 초과: 학점이월·성적우수 시 ${GRAD.semesterMaxCarry}학점까지)`
                      : ""}
                </span>
                <span className={pts > GRAD.semesterCap ? "warn" : ""}>
                  비교과 {pts}pt{pts > GRAD.semesterCap ? ` (학기당 ${GRAD.semesterCap}pt까지 인정)` : ""}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      <p className="hint">
        과목의 학년·학기와 이수구분은 각 트랙 공식 교육과정 기준이고, 교양 과목의 학기 배치와 전공선택 과목 선택은 예시예요. 한 학기가 기본 수강 한도({GRAD.semesterMax}학점)를 넘지 않게 교양·전공선택을 나눠 배치했고, 옮긴 전공 과목에는 교육과정상 학기를 적어 두었어요. '추천'이 붙은 비교과는 내가 담은 프로그램이 없는 학기에
        앱이 채운 것으로, '비교과 추천' 탭에서 바꿀 수 있어요. 교양 외 자유선택 {GRAD.free}학점은 따로 채워야 해요.
      </p>
    </section>
  );
}

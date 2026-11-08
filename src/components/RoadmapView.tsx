import { useRef, useState, type DragEvent } from "react";
import { MODULAR, modulePath } from "../data/modules";
import { GRAD, MODE_RULES } from "../data/rules";
import { SEM_NAMES } from "../data/tracks";
import { CATALOG_NAMES } from "../lib/learning";
import { planParts, planTitle, type PlanPart } from "../lib/plan";
import { pastReviewed, pastUnchecked, semesterCredits, trackCredits, unitText } from "../lib/roadmap";
import type { AppState, CustomItem, Edits, Plan, PlanItem, Roadmap } from "../types";
import { Tip } from "./Tip";

/** 교과 로드맵 직접 수정 (시간표처럼 옮기기·바꾸기·추가) */
export interface EditApi {
  edits: Edits;
  /** 학습 데이터(성적)로 자동 이수 처리된 항목 */
  auto: AppState["checks"];
  paths: Record<string, string>;
  jobs: string[];
  onMove: (id: string, sem: number) => void;
  onUnmove: (id: string) => void;
  onSwap: (kind: "a" | "b", from: string, to: string) => void;
  onRename: (id: string, name: string) => void;
  onAdd: (item: Omit<CustomItem, "id">) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
  onPath: (track: string, label: string) => void;
}

const editCount = (e: Edits) =>
  Object.keys(e.moves ?? {}).length + (e.drops?.length ?? 0) + Object.keys(e.renames ?? {}).length + (e.custom?.length ?? 0);

const LIBERAL_SLOT = /^(선택필수교양\(|자율 교양|교양 \d+ \()/;

function ItemEditor({ it, sem, plan, roadmap, api, onClose }: { it: PlanItem; sem: number; plan: Plan; roadmap: Roadmap; api: EditApi; onClose: () => void }) {
  const [to, setTo] = useState(sem);
  const [swap, setSwap] = useState("");
  const renamed = api.edits.renames?.[it.id];
  const [nm, setNm] = useState(renamed ?? "");
  const track = it.kind === "a" ? plan.a : it.kind === "b" ? plan.b : null;
  const inPlan = new Set(roadmap.flat().map((x) => x.name));
  const swaps = track && it.req === "선" && !it.carryOf ? track.courses.filter((c) => c.req === "선" && !inPlan.has(c.name)) : [];
  const slot = it.kind === "g" && (LIBERAL_SLOT.test(it.name) || !!renamed) && !it.carryOf;
  return (
    <div className="editor" role="group" aria-label={`${it.name} 수정`}>
      <div className="ed-row">
        <label htmlFor={`mv-${it.id}`}>학기 옮기기</label>
        <select id={`mv-${it.id}`} value={to} onChange={(e) => setTo(Number(e.target.value))}>
          {SEM_NAMES.map((n, i) => (
            <option key={n} value={i}>
              {n}
            </option>
          ))}
        </select>
        <button type="button" className="btn small" disabled={to === sem} onClick={() => (api.onMove(it.id, to), onClose())}>
          옮기기
        </button>
        {it.manual === "moved" && (
          <button type="button" className="link-btn" onClick={() => (api.onUnmove(it.id), onClose())}>
            원래 자리로
          </button>
        )}
      </div>
      {swaps.length > 0 && (
        <div className="ed-row">
          <label htmlFor={`sw-${it.id}`}>다른 전공선택으로</label>
          <select id={`sw-${it.id}`} value={swap} onChange={(e) => setSwap(e.target.value)}>
            <option value="">과목 고르기</option>
            {swaps.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.term})
              </option>
            ))}
          </select>
          <button type="button" className="btn small" disabled={!swap} onClick={() => (api.onSwap(it.kind as "a" | "b", it.name, swap), onClose())}>
            바꾸기
          </button>
        </div>
      )}
      {slot && (
        <div className="ed-row">
          <label htmlFor={`rn-${it.id}`}>실제 과목명</label>
          <input id={`rn-${it.id}`} list="course-names-rm" value={nm} onChange={(e) => setNm(e.target.value)} placeholder="예: 생활 속의 심리학" />
          <button type="button" className="btn small" onClick={() => (api.onRename(it.id, nm.trim()), onClose())}>
            {nm.trim() ? "저장" : "비우기"}
          </button>
        </div>
      )}
      {it.manual === "custom" && (
        <div className="ed-row">
          <button type="button" className="btn ghost small" onClick={() => (api.onRemove(it.id), onClose())}>
            이 과목 빼기
          </button>
        </div>
      )}
      <button type="button" className="link-btn ed-close" onClick={onClose}>
        닫기
      </button>
    </div>
  );
}

function AddCourse({ sem, plan, api, onClose }: { sem: number; plan: Plan; api: EditApi; onClose: () => void }) {
  const [name, setName] = useState("");
  const [credit, setCredit] = useState(3);
  const [kind, setKind] = useState<CustomItem["kind"]>("f");
  const ok = name.trim().length >= 2;
  return (
    <div className="editor add" role="group" aria-label={`${SEM_NAMES[sem]} 과목 추가`}>
      <div className="ed-row">
        <label htmlFor={`ad-n-${sem}`}>과목명</label>
        <input id={`ad-n-${sem}`} list="course-names-rm" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 생활 속의 심리학" />
      </div>
      <div className="ed-row">
        <label htmlFor={`ad-k-${sem}`}>구분</label>
        <select id={`ad-k-${sem}`} value={kind} onChange={(e) => setKind(e.target.value as CustomItem["kind"])}>
          <option value="f">자유선택(일반선택)</option>
          <option value="g">교양</option>
          <option value="a">{planParts(plan)[0].spec.label} 전공</option>
          {plan.b && <option value="b">{planParts(plan)[1]?.spec.label ?? "2트랙"} 전공</option>}
        </select>
        <label htmlFor={`ad-c-${sem}`}>학점</label>
        <select id={`ad-c-${sem}`} value={credit} onChange={(e) => setCredit(Number(e.target.value))}>
          {[1, 2, 3, 4].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button type="button" className="btn small" disabled={!ok} onClick={() => (api.onAdd({ sem, name: name.trim(), credit, kind }), onClose())}>
          추가
        </button>
        <button type="button" className="link-btn" onClick={onClose}>
          취소
        </button>
      </div>
    </div>
  );
}

function TrackSource({ part, roadmap, api }: { part: PlanPart; roadmap: Roadmap; api?: EditApi }) {
  const { t, spec, kind } = part;
  const mod = MODULAR[t.name];
  const path = api ? modulePath(t.name, api.jobs, api.paths[t.name]) : null;
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
      {mod && api && (
        <span className="path-pick">
          <label htmlFor={`path-${kind}`}>모듈형 진로 경로</label>
          <select id={`path-${kind}`} value={path?.label ?? ""} onChange={(e) => api.onPath(t.name, e.target.value)}>
            {!path && <option value="">경로 고르기</option>}
            {mod.paths.map((x) => (
              <option key={x.label} value={x.label}>
                {x.label} ({x.modules.join("+")})
              </option>
            ))}
          </select>
          <small className="hint">고른 경로의 모듈 과목을 전공선택에 먼저 넣어요</small>
        </span>
      )}
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
  api,
}: {
  api: EditApi;
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
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const edited = editCount(api.edits);
  const autoCount = Object.keys(api.auto).length;

  const onDrop = (k: number) => (e: DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) api.onMove(id, k);
  };

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
          <span className="pill f">자유선택</span>
          <span className="pill x">비교과</span>
          <span className="pill carry">다시 들을 과목</span>
        </div>
      </div>
      <Tip>
        시간표처럼 고칠 수 있어요. 과목 오른쪽 ⋯를 누르면 학기 옮기기·다른 전공선택으로 바꾸기·교양 실제 과목명 적기를, 학기 아래 '+ 과목 추가'로 자유선택 과목을 넣을 수 있어요. 컴퓨터에서는 과목을 끌어 다른 학기에 놓아도 돼요.
        {autoCount > 0 && ` 성적표에서 읽은 과목 ${autoCount}개는 이수로 체크해 뒀어요.`}
      </Tip>

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
          <TrackSource key={x.kind} part={x} roadmap={roadmap} api={api} />
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
          {edited > 0 && (
            <button type="button" className="btn ghost" id="resetEdits" onClick={api.onReset}>
              직접 고친 {edited}곳 되돌리기
            </button>
          )}
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
            <article
              key={k}
              className={`card sem${k === now ? " now" : k < now ? " past" : ""}${dragOver === k ? " drop" : ""}`}
              onDragOver={(e) => (e.preventDefault(), dragOver !== k && setDragOver(k))}
              onDragLeave={() => setDragOver(null)}
              onDrop={onDrop(k)}
            >
              <div className="sem-head">
                <h3>{SEM_NAMES[k]}</h3>
                {state}
              </div>
              {items.map((it, j) => {
                const id = `it-${k}-${j}`;
                const on = !!checks[it.id];
                const credit = it.kind === "a" || it.kind === "b" || it.kind === "g" || it.kind === "f";
                const cls = [
                  "item",
                  it.kind,
                  on ? "checked" : "",
                  it.req === "필" || it.req === "기" ? "req" : "",
                  it.auto ? "auto" : "",
                  it.carryOf ? "carry" : "",
                  it.manual ? `manual ${it.manual}` : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div key={it.id} className="item-wrap">
                    <div
                      className={cls}
                      draggable={credit}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", it.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <input type="checkbox" id={id} checked={on} onChange={(e) => onToggle(it.id, e.target.checked)} />
                      <label htmlFor={id}>
                        <span>{it.name}</span>
                        <small>
                          {it.sub}
                          {api.auto[it.id] ? " · 성적표 이수" : ""}
                        </small>
                      </label>
                      <span className="u">{unitText(it)}</span>
                      {credit && (
                        <button type="button" className="edit-btn" aria-label={`${it.name} 수정`} aria-expanded={editing === it.id} onClick={() => setEditing(editing === it.id ? null : it.id)}>
                          ⋯
                        </button>
                      )}
                    </div>
                    {editing === it.id && <ItemEditor it={it} sem={k} plan={plan} roadmap={roadmap} api={api} onClose={() => setEditing(null)} />}
                  </div>
                );
              })}
              {adding === k ? (
                <AddCourse sem={k} plan={plan} api={api} onClose={() => setAdding(null)} />
              ) : (
                <button type="button" className="link-btn add-course" onClick={() => setAdding(k)}>
                  + 과목 추가
                </button>
              )}
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
        앱이 채운 것으로, '비교과 로드맵' 탭에서 바꿀 수 있어요. 교양 외 자유선택 {GRAD.free}학점은 '+ 과목 추가'로 넣거나 성적표의 다른 과목으로 채워져요.
      </p>
      <datalist id="course-names-rm">
        {CATALOG_NAMES.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </section>
  );
}

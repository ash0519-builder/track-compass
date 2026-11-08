import { useMemo, useState } from "react";
import { programUrl } from "../data/programs";
import { GRAD } from "../data/rules";
import { SEM_NAMES } from "../data/tracks";
import {
  cleanProgramName,
  goalPath,
  icsOf,
  runText,
  STATUS_LABEL,
  statusOf,
  suggestThemes,
  THEMES,
  todayISO,
  upcomingOf,
  type Scored,
  type ThemeId,
} from "../lib/programs";
import type { Profile } from "../types";
import { Programs } from "./Programs";
import { Tip } from "./Tip";

const TIERS = [
  { pts: 200, label: "1단계", note: "학기당 인정 상한" },
  { pts: 400, label: "2단계", note: "절반 달성" },
  { pts: 600, label: "3단계", note: "졸업 준비" },
  { pts: 800, label: "졸업요건", note: "비교과 800pt 충족" },
];

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 비교과 로드맵: 목표 → 입문·성장·도전 단계 → 포인트 패스 → 일정 */
export function ExtraRoadmap({
  profile,
  recs,
  picks,
  now,
  points,
  checkedPts,
  onPick,
  onUnpick,
  onThemes,
}: {
  profile: Profile;
  recs: Scored[];
  picks: Record<string, number>;
  now: number;
  /** 지금까지 모은 포인트 (입력값 또는 체크한 비교과) */
  points: number;
  /** 로드맵에서 이수 체크한 담은 프로그램 포인트 */
  checkedPts: number;
  onPick: (id: number, sem: number) => void;
  onUnpick: (id: number) => void;
  onThemes: (themes: string[]) => void;
}) {
  const today = todayISO();
  const chosen = (profile.extraThemes ?? []) as ThemeId[];
  const goals = chosen.length ? chosen : suggestThemes(profile);
  const paths = useMemo(() => goals.map((g) => ({ g, steps: goalPath(g, recs, now, 4, today) })), [goals.join(), recs, now, today]);
  const [semFor, setSemFor] = useState<Record<number, number>>({});

  const pickedList = Object.entries(picks)
    .map(([id, sem]) => ({ r: recs.find((x) => x.p.id === Number(id)), sem }))
    .filter((x): x is { r: Scored; sem: number } => !!x.r);
  const plannedPts = pickedList.reduce((s, x) => s + x.r.p.p, 0) - checkedPts;
  const total = Math.max(0, points + Math.max(0, plannedPts));
  const pct = (v: number) => `${Math.min(100, (v / GRAD.extraPoints) * 100)}%`;
  const upcoming = upcomingOf([...pickedList.map((x) => x.r), ...paths.flatMap((x) => x.steps.flatMap((s) => s.items.map((i) => i.r)))].filter((v, i, a) => a.findIndex((y) => y.p.id === v.p.id) === i), today).slice(0, 12);
  const icsItems = pickedList.map((x) => x.r).filter((r) => r.p.e >= today);

  function toggleGoal(id: string) {
    const base = chosen.length ? chosen : [];
    onThemes(base.includes(id as ThemeId) ? base.filter((x) => x !== id) : [...base, id].slice(-3));
  }

  return (
    <section className="panel" id="p-extra">
      <div className="panel-head">
        <div>
          <h2>비교과 로드맵</h2>
          <p>목표를 고르면 입문 → 성장 → 도전 순서로 비교과 길을 만들어요. 담은 프로그램은 교과 로드맵의 그 학기에도 들어가고, 포인트 패스가 졸업요건 {GRAD.extraPoints}pt까지 채워져요.</p>
        </div>
      </div>
      <Tip>포인트만 채우려면 아무 프로그램이나 들어도 되지만, 목표(어학·취업·AI 등)를 정해 단계별로 들으면 한성인재인증과 포트폴리오에 남길 이야기가 생겨요.</Tip>

      <div className="card want">
        <div>
          <b>무엇을 얻고 싶나요?</b>
          <span className="hint"> 최대 3개 {chosen.length ? "" : `· 아직 고르지 않아 진로 진단으로 '${goals.map((g) => THEMES.find((t) => t.id === g)?.label).join("', '")}'을 골라 뒀어요`}</span>
        </div>
        <div className="chips">
          {THEMES.filter((t) => t.id !== "major").map((t) => (
            <button key={t.id} type="button" className="chip" id={`goal-${t.id}`} aria-pressed={chosen.includes(t.id)} onClick={() => toggleGoal(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card pass" aria-label="비교과 포인트 패스">
        <div className="pass-head">
          <b>포인트 패스</b>
          <span>
            모은 포인트 <b>{points}pt</b> · 담은 프로그램까지 <b>{total}pt</b> / {GRAD.extraPoints}pt
          </span>
        </div>
        <div className="pass-bar">
          <i className="planned" style={{ width: pct(total) }} />
          <i className="done" style={{ width: pct(points) }} />
          {TIERS.map((t) => (
            <span key={t.pts} className={`tier${total >= t.pts ? " on" : ""}`} style={{ left: pct(t.pts) }} title={t.note}>
              <em>{t.label}</em>
              <small>{t.pts}pt</small>
            </span>
          ))}
        </div>
        <p className="hint">학기마다 최대 {GRAD.semesterCap}pt까지 인정돼요. 남은 학기 {Math.max(1, 8 - now)}개 × {GRAD.semesterCap}pt 안에서 계획하세요.</p>
      </div>

      {paths.map(({ g, steps }) => {
        const label = THEMES.find((t) => t.id === g)?.label;
        return (
          <article key={g} className="card path" id={`path-${g}`}>
            <h3>
              <span className="pill x">목표</span> {label}
            </h3>
            <div className="stages">
              {steps.map((step) => (
                <div key={step.stage.n} className={`stage s${step.stage.n}`}>
                  <div className="stage-head">
                    <b>
                      {step.stage.n}단계 · {step.stage.name}
                    </b>
                    <small>{step.stage.desc}</small>
                  </div>
                  {step.items.length === 0 && <p className="hint">이 단계에 맞는 프로그램이 지금 목록에 없어요. 다음 학기 공지를 확인하세요.</p>}
                  {step.items.map(({ r, sem }) => {
                    const picked = picks[String(r.p.id)];
                    const sel = semFor[r.p.id] ?? sem;
                    const st = statusOf(r.p, today);
                    return (
                      <div key={r.p.id} className={`mini-prog${picked !== undefined ? " picked" : ""}`}>
                        <div className="mp-top">
                          <a href={programUrl(r.p.id)} target="_blank" rel="noreferrer">
                            {cleanProgramName(r.p.t)}
                          </a>
                          <span className="pts">{r.p.p ? `${r.p.p}pt` : "pt 공지"}</span>
                        </div>
                        <small className="meta">
                          {runText(r.p, today)}
                          {st === "open" ? ` · ${STATUS_LABEL.open}` : ""}
                          {r.years ? ` · ${r.years.join("·")}학년 추천` : ""}
                          {r.p.cert ? " · 인재인증" : ""}
                        </small>
                        {picked !== undefined ? (
                          <div className="mp-act">
                            <span className="hint">✓ {SEM_NAMES[picked]}에 담음</span>
                            <button type="button" className="link-btn" onClick={() => onUnpick(r.p.id)}>
                              빼기
                            </button>
                          </div>
                        ) : (
                          <div className="mp-act">
                            <label className="sr-only" htmlFor={`gs-${g}-${r.p.id}`}>
                              담을 학기
                            </label>
                            <select id={`gs-${g}-${r.p.id}`} value={sel} onChange={(e) => setSemFor({ ...semFor, [r.p.id]: Number(e.target.value) })}>
                              {SEM_NAMES.map((n, i) => (
                                <option key={n} value={i} disabled={i < now}>
                                  {n}
                                </option>
                              ))}
                            </select>
                            <button type="button" className="btn small" onClick={() => onPick(r.p.id, sel)}>
                              담기
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </article>
        );
      })}

      <div className="card schedule" id="schedule">
        <div className="pass-head">
          <b>다가오는 일정</b>
          <button type="button" className="btn ghost small" id="icsBtn" disabled={!icsItems.length} onClick={() => download("트랙나침반_비교과일정.ics", icsOf(icsItems, today), "text/calendar")}>
            담은 프로그램 캘린더에 넣기 (.ics)
          </button>
        </div>
        {upcoming.length ? (
          <ul className="upcoming">
            {upcoming.map((u) => (
              <li key={`${u.p.id}-${u.kind}`}>
                <span className={`d ${u.kind === "마감" ? "due" : ""}`}>
                  {Number(u.date.slice(5, 7))}/{Number(u.date.slice(8, 10))}
                </span>
                <span className="k">{u.kind === "마감" ? "신청 마감" : "운영 시작"}</span>
                <span className="n">
                  {cleanProgramName(u.p.t)}
                  {picks[String(u.p.id)] !== undefined ? " · 담음" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">앞으로 120일 안에 신청 마감·운영 시작이 있는 추천 프로그램이 없어요. 학기 초 공지를 확인하세요.</p>
        )}
        <p className="hint">.ics 파일을 열면 휴대폰·구글 캘린더에 신청 마감일과 운영 기간이 들어가요. 담은 프로그램 중 아직 끝나지 않은 것만 넣어요.</p>
      </div>

      <Programs profile={profile} recs={recs} picks={picks} now={now} onPick={onPick} onUnpick={onUnpick} onThemes={onThemes} embedded />
    </section>
  );
}

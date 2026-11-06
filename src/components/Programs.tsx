import { useMemo, useState } from "react";
import { programUrl, PROGRAMS_SOURCE } from "../data/programs";
import { GRAD } from "../data/rules";
import { SEM_NAMES } from "../data/tracks";
import { semesterLabel, STATUS_LABEL, statusOf, THEMES, themeCounts, type Scored, type ThemeId } from "../lib/programs";
import type { Profile } from "../types";

const PAGE = 12;

export function Programs({
  profile,
  recs,
  picks,
  now,
  onPick,
  onUnpick,
  onThemes,
}: {
  profile: Profile;
  recs: Scored[];
  picks: Record<string, number>;
  now: number;
  onPick: (id: number, sem: number) => void;
  onUnpick: (id: number) => void;
  onThemes: (themes: string[]) => void;
}) {
  const [theme, setTheme] = useState<ThemeId | "all">("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [semFor, setSemFor] = useState<Record<number, number>>({});

  const counts = useMemo(() => themeCounts(recs), [recs]);
  const list = recs.filter((r) => (theme === "all" ? r.score > 0 : r.themes.includes(theme))).filter((r) => !openOnly || statusOf(r.p) === "open");
  const wanted = profile.extraThemes ?? [];
  const pickedList = Object.entries(picks)
    .map(([id, sem]) => ({ r: recs.find((x) => x.p.id === Number(id)), sem }))
    .filter((x) => x.r);
  const pickedPts = pickedList.reduce((s, x) => s + (x.r?.p.p ?? 0), 0);
  const defaultSem = Math.min(7, Math.max(0, now));

  function toggleWanted(id: string) {
    const next = wanted.includes(id) ? wanted.filter((w) => w !== id) : [...wanted, id].slice(-3);
    onThemes(next);
  }

  return (
    <section className="panel" id="p-programs">
      <div className="panel-head">
        <div>
          <h2>나에게 맞는 비교과 프로그램</h2>
          <p>
            한성대 스마트자기관리시스템의 실제 비교과 {recs.length}개를 진로 진단 결과와 선택한 트랙에 맞춰 순서를 매겼어요. 담은 프로그램은 학기별 로드맵에 들어가고, 비워둔 학기는
            추천 상위 프로그램으로 채워져요.
          </p>
        </div>
      </div>

      <div className="card want">
        <div>
          <b>비교과로 키우고 싶은 분야</b>
          <span className="hint"> 최대 3개 · 고른 분야의 프로그램을 가장 먼저 추천해요</span>
        </div>
        <div className="chips">
          {THEMES.filter((t) => t.id !== "major").map((t) => (
            <button key={t.id} type="button" className="chip" aria-pressed={wanted.includes(t.id)} onClick={() => toggleWanted(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="picked-sum">
          담은 비교과 <b>{pickedList.length}개</b> · 예상 <b>{pickedPts}pt</b>
          <span className="hint"> (졸업요건 {GRAD.extraPoints}pt, 학기당 최대 {GRAD.semesterCap}pt 인정)</span>
        </div>
      </div>

      <div className="theme-tabs" role="tablist" aria-label="비교과 카테고리">
        <button type="button" role="tab" aria-selected={theme === "all"} className="tab-chip" onClick={() => (setTheme("all"), setLimit(PAGE))}>
          맞춤 추천
        </button>
        {THEMES.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={theme === t.id} className="tab-chip" onClick={() => (setTheme(t.id), setLimit(PAGE))}>
            {t.label} <span className="cnt">{counts[t.id] ?? 0}</span>
          </button>
        ))}
        <label className="open-only">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> 지금 신청 가능한 것만
        </label>
      </div>

      {list.length === 0 && <p className="hint">조건에 맞는 프로그램이 없어요. 카테고리나 필터를 바꿔 보세요.</p>}

      <div className="prog-list">
        {list.slice(0, limit).map((r, k) => {
          const st = statusOf(r.p);
          const picked = picks[String(r.p.id)];
          const sel = semFor[r.p.id] ?? defaultSem;
          return (
            <article key={r.p.id} className={`card prog${picked !== undefined ? " picked" : ""}`}>
              <div className="prog-top">
                <span className="rank">{theme === "all" ? `${k + 1}위` : THEMES.find((t) => t.id === theme)?.label}</span>
                <span className={`status ${st}`}>{STATUS_LABEL[st]}</span>
                <span className="pts">{r.p.p ? `${r.p.p}pt` : "포인트 공지 확인"}</span>
              </div>
              <h3>{r.p.t}</h3>
              <p className="meta">
                {r.p.o} · {r.p.c1} · {r.p.c2} · {r.p.team}
                {r.p.cert ? " · 인재인증" : ""}
              </p>
              <p className="meta">
                운영 {r.p.sems.map(semesterLabel).join(", ")} ({r.p.s.slice(5).replace("-", ".")}
                {r.p.e !== r.p.s ? `~${r.p.e.slice(5).replace("-", ".")}` : ""})
              </p>
              {r.reasons.length > 0 && <p className="why">추천 이유: {r.reasons.join(" · ")}</p>}
              <div className="theme-tags">
                {r.themes.map((t) => (
                  <span key={t} className="ttag">
                    {THEMES.find((x) => x.id === t)?.label}
                  </span>
                ))}
              </div>
              <div className="prog-actions">
                {picked !== undefined ? (
                  <>
                    <span className="hint">{SEM_NAMES[picked]}에 담김</span>
                    <button type="button" className="btn ghost" onClick={() => onUnpick(r.p.id)}>
                      빼기
                    </button>
                  </>
                ) : (
                  <>
                    <label className="sr-only" htmlFor={`sem-${r.p.id}`}>
                      담을 학기
                    </label>
                    <select id={`sem-${r.p.id}`} value={sel} onChange={(e) => setSemFor({ ...semFor, [r.p.id]: Number(e.target.value) })}>
                      {SEM_NAMES.map((n, i) => (
                        <option key={n} value={i}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn" onClick={() => onPick(r.p.id, sel)}>
                      로드맵에 담기
                    </button>
                  </>
                )}
                <a href={programUrl(r.p.id)} target="_blank" rel="noreferrer">
                  신청 페이지
                </a>
              </div>
            </article>
          );
        })}
      </div>
      {list.length > limit && (
        <button type="button" className="btn ghost more" onClick={() => setLimit(limit + PAGE)}>
          더 보기 ({list.length - limit}개 남음)
        </button>
      )}
      <p className="hint">
        출처: <a href={PROGRAMS_SOURCE.url}>{PROGRAMS_SOURCE.label}</a> ({PROGRAMS_SOURCE.collected} 기준, 2025년 2학기~2026년 2학기 운영분). 대부분 매 학기 다시 열리지만 일정과 포인트는
        바뀔 수 있으니 신청 전에 공지를 확인하세요.
      </p>
    </section>
  );
}

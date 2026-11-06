import { useState } from "react";
import { COLLEGES, findEntry, TRACKS } from "../data/tracks";
import { comboNotes, firstCandidates, rankedTracks, reasonLines, toPoints, validCombo } from "../lib/scoring";
import type { Combo, Profile, Track } from "../types";
import { entryName } from "./Summary";

const same = (x: Combo, y: Combo) => x.a.name === y.a.name && x.b.name === y.b.name;

function TrackHead({ t, label, tone, score }: { t: Track; label: string; tone: string; score: number }) {
  return (
    <div className="tr">
      <span className={`pill ${tone}`}>{label}</span>
      <h3>{t.name}</h3>
      <small>
        {COLLEGES[t.college].name} · {t.school === t.name ? "학과" : t.school} · {t.offer === "주야" ? "주·야" : `${t.offer}만`} · 적합도 {toPoints(score)}
      </small>
    </div>
  );
}

const collegeOrder = ["HUM", "SOC", "DES", "ENG", "CON"] as const;

/** 이미 트랙을 정한 학생이 자기 조합을 직접 고르는 칸 */
function ManualPicker({ profile, pick, onPick }: { profile: Profile; pick: Combo; onPick: (c: Combo) => void }) {
  const firsts = firstCandidates(profile);
  const [a, setA] = useState(firsts.includes(pick.a) ? pick.a.name : firsts[0]?.name ?? "");
  const [b, setB] = useState(pick.b.name);
  const combo = validCombo(profile, a, b);
  const isCurrent = combo && combo.a.name === pick.a.name && combo.b.name === pick.b.name;
  return (
    <div className="card manual" id="manual-pick">
      <div>
        <h3>이미 정한 트랙이 있나요?</h3>
        <p className="hint">추천과 관계없이 내 제1·제2트랙을 직접 골라 로드맵을 만들 수 있어요. 제1트랙은 소속 모집단위 안에서만 고를 수 있어요.</p>
      </div>
      <div className="manual-row">
        <label className="f" htmlFor="trackA">
          제1트랙
          <select
            id="trackA"
            value={a}
            onChange={(e) => {
              const v = e.target.value;
              setA(v);
              if (b === v) setB(TRACKS.find((t) => t.name !== v)!.name);
            }}
          >
            {firsts.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="f" htmlFor="trackB">
          제2트랙
          <select id="trackB" value={b} onChange={(e) => setB(e.target.value)}>
            {collegeOrder.map((col) => (
              <optgroup key={col} label={COLLEGES[col].name}>
                {TRACKS.filter((t) => t.college === col && t.name !== a).map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                    {t.offer !== "주야" ? ` (${t.offer}만)` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button type="button" className="btn" disabled={!combo || !!isCurrent} onClick={() => combo && onPick(combo)}>
          {isCurrent ? "선택된 조합" : "이 조합으로 로드맵 만들기"}
        </button>
      </div>
      {combo ? (
        <p className="hint">
          이 조합 점수 {toPoints(combo.total)} / 110점
          {comboNotes(combo, profile).length ? ` · ${comboNotes(combo, profile).join(" · ")}` : ""}
        </p>
      ) : (
        <p className="warn">제1트랙과 제2트랙을 서로 다르게 골라주세요.</p>
      )}
    </div>
  );
}

export function Recommend({ profile, top, pick, onPick }: { profile: Profile; top: Combo[]; pick: Combo; onPick: (c: Combo) => void }) {
  const rows = rankedTracks(profile).slice(0, 8);
  const entry = findEntry(profile.entry);
  const firstCount = firstCandidates(profile).length;
  return (
    <section className="panel" id="p-recommend">
      <div className="panel-head">
        <div>
          <h2>나에게 맞는 트랙 조합 Top 3</h2>
          <p>
            {entryName(profile)} 기준입니다.{" "}
            {entry.free
              ? "상상력인재학부는 제1·제2트랙 모두 거의 모든 트랙에서 고를 수 있어요."
              : entry.dept
                ? `제1전공은 ${entry.name}이고, 제2트랙은 전체에서 골랐어요.`
                : `제1트랙은 ${entry.name}의 ${firstCount}개 트랙 중에서, 제2트랙은 전체에서 골랐어요.`}
          </p>
        </div>
      </div>

      {profile.year >= 2 && <ManualPicker key={pick.a.name + pick.b.name} profile={profile} pick={pick} onPick={onPick} />}

      <div className="recs">
        {top.map((c, k) => {
          const sel = same(c, pick);
          const notes = comboNotes(c, profile);
          return (
            <article key={c.a.name + c.b.name} className={`card rec${sel ? " sel" : ""}`}>
              <div className="rank">
                추천 {k + 1}순위{sel ? " · 선택됨" : ""}
              </div>
              <TrackHead t={c.a} label="1트랙" tone="" score={c.sa} />
              <TrackHead t={c.b} label="2트랙" tone="b" score={c.sb} />
              <div className="score">
                <b>{toPoints(c.total)}</b>
                <span>
                  / 110점 = 평균 적합도 {toPoints(c.base)}
                  {c.bonus ? ` + 융합 ${toPoints(c.bonus)}` : ""}
                </span>
              </div>
              <ul>
                {reasonLines(c, profile).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              {notes.length > 0 && (
                <ul className="notes">
                  {notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
              <button type="button" className={`btn${sel ? " ghost" : ""}`} onClick={() => onPick(c)}>
                {sel ? "로드맵 보기" : "이 조합으로 로드맵 만들기"}
              </button>
            </article>
          );
        })}
      </div>

      {profile.year < 2 && <ManualPicker key={pick.a.name + pick.b.name} profile={profile} pick={pick} onPick={onPick} />}

      <div className="card top-list">
        <h3>트랙별 적합도 상위 8개</h3>
        <p className="hint">적합도 = 관심 분야 일치 50% + 희망 직무 일치 30% + 강점 일치 20%. 트랙 이름을 누르면 학교 공식 교육과정 페이지가 열려요.</p>
        <div className="scroll-x">
          <table>
            <thead>
              <tr>
                <th>트랙</th>
                <th>소속</th>
                <th>개설</th>
                <th>적합도</th>
                <th>
                  <span className="sr-only">막대</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.t.name}>
                  <td>
                    <a href={r.t.source} target="_blank" rel="noreferrer">
                      {r.t.name}
                    </a>
                  </td>
                  <td>{r.t.school === r.t.name ? COLLEGES[r.t.college].name : r.t.school}</td>
                  <td>{r.t.offer === "주야" ? "주·야" : r.t.offer}</td>
                  <td className="n">{toPoints(r.s)}</td>
                  <td>
                    <div className="mini">
                      <i style={{ width: `${toPoints(r.s)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

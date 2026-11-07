import { useState } from "react";
import { MODE_RULES } from "../data/rules";
import { COLLEGES, findEntry, TRACKS } from "../data/tracks";
import { comboNotes, firstCandidates, rankedTracks, reasonLines, toPoints, validCombo } from "../lib/scoring";
import type { Combo, MajorMode, Plan, Profile, Track } from "../types";
import { planKey } from "../lib/plan";
import { entryName } from "./Summary";

const same = (x: Combo, plan: Plan) => plan.mode === "fusion1" && !!plan.b && x.a.name === plan.a.name && x.b.name === plan.b.name;

/** 제2트랙 칸의 특수 값 */
const NONE = "__none";
const DEEP = "__deep";

export type OnPlan = (a: string, b: string | null, mode: MajorMode) => void;

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

/** 이미 트랙을 정했거나 제2트랙을 하지 않는 학생이 직접 고르는 칸 */
function ManualPicker({ profile, plan, onPlan }: { profile: Profile; plan: Plan; onPlan: OnPlan }) {
  const firsts = firstCandidates(profile);
  const [a, setA] = useState(firsts.includes(plan.a) ? plan.a.name : firsts[0]?.name ?? "");
  const [b, setB] = useState(plan.b ? plan.b.name : plan.mode === "deep" ? DEEP : NONE);
  const [minor, setMinor] = useState(plan.mode === "fusion2");
  const aTrack = firsts.find((t) => t.name === a);
  const dept = aTrack?.kind === "학과";
  const isTrackB = b !== NONE && b !== DEEP;
  const mode: MajorMode = b === DEEP ? "deep" : b === NONE ? "undecided" : minor && dept ? "fusion2" : "fusion1";
  const combo = isTrackB ? validCombo(profile, a, b) : null;
  const ok = !!aTrack && (mode === "deep" ? dept : mode === "undecided" ? true : !!combo);
  const isCurrent = ok && plan.mode === mode && plan.a.name === a && (plan.b?.name ?? null) === (combo ? combo.b.name : null);
  const entry = findEntry(profile.entry);

  let hint = "";
  if (mode === "fusion1" && combo) {
    const notes = comboNotes(combo, profile);
    hint = `융합전공Ⅰ · 이 조합 점수 ${toPoints(combo.total)} / 110점${notes.length ? ` · ${notes.join(" · ")}` : ""}`;
  } else if (mode === "fusion2" && combo) {
    hint = `${MODE_RULES.fusion2.name} · ${MODE_RULES.fusion2.desc}`;
  } else if (mode === "deep") {
    hint = `${MODE_RULES.deep.name} · ${MODE_RULES.deep.desc}`;
  } else if (mode === "undecided") {
    hint =
      dept || entry.dept
        ? "제2트랙·부전공·심화전공은 나중에 정해도 돼요. 정하기 전까지 제1전공 39학점만 계획해요."
        : "트랙제 입학생은 2학년 진학 시 제2트랙도 꼭 골라야 해요. 정하기 전까지 제1트랙 39학점만 계획하고, 로드맵에 '제2트랙 정하기'를 넣어 둘게요.";
  }

  return (
    <div className="card manual" id="manual-pick">
      <div>
        <h3>직접 고르기</h3>
        <p className="hint">
          이미 정한 트랙이 있거나 제2트랙을 아직 안 정했다면 여기서 고르세요. 제1트랙은 소속 모집단위 안에서만 고를 수 있어요.
          {dept ? " 학과 소속이면 제2트랙 없이 심화전공이나 부전공으로도 이수할 수 있어요." : ""}
        </p>
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
              if (b === DEEP && firsts.find((t) => t.name === v)?.kind !== "학과") setB(NONE);
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
            <optgroup label="제2트랙 없이">
              <option value={NONE}>아직 안 정함 (제1트랙만 먼저 계획)</option>
              <option value={DEEP} disabled={!dept}>
                선택 안 함 · 심화전공 ({dept ? "학과 78학점" : "학과 소속만"})
              </option>
            </optgroup>
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
        <button type="button" className="btn" disabled={!ok || isCurrent} onClick={() => ok && onPlan(a, combo ? combo.b.name : null, mode)}>
          {isCurrent ? "선택된 계획" : "이대로 로드맵 만들기"}
        </button>
      </div>
      {dept && isTrackB && (
        <label className="check" htmlFor="asMinor">
          <input id="asMinor" type="checkbox" checked={minor} onChange={(e) => setMinor(e.target.checked)} />
          제2트랙 대신 부전공(21학점)으로 이수 · 융합전공Ⅱ (학과 전공 57학점)
        </label>
      )}
      {ok ? <p className="hint">{hint}</p> : <p className="warn">제1트랙과 제2트랙을 서로 다르게 골라주세요.</p>}
    </div>
  );
}

export function Recommend({ profile, top, plan, onPick, onPlan }: { profile: Profile; top: Combo[]; plan: Plan; onPick: (c: Combo) => void; onPlan: OnPlan }) {
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
          <p className="hint">
            {entry.dept
              ? "학과 입학생은 제2트랙 없이 심화전공(학과 78학점)이나 부전공(학과 57 + 부전공 21학점)으로도 이수할 수 있어요. '직접 고르기'에서 선택하세요."
              : "트랙제 입학생은 2학년 진학 시 제1·제2트랙을 모두 골라야 해요. 제2트랙을 아직 못 정했다면 '직접 고르기'에서 '아직 안 정함'을 고르세요."}
          </p>
        </div>
      </div>

      {profile.year >= 2 && <ManualPicker key={planKey(plan)} profile={profile} plan={plan} onPlan={onPlan} />}

      <div className="recs">
        {top.map((c, k) => {
          const sel = same(c, plan);
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

      {profile.year < 2 && <ManualPicker key={planKey(plan)} profile={profile} plan={plan} onPlan={onPlan} />}

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

import { COLLEGES } from "../data/tracks";
import { rankedTracks, reasonLines, toPoints } from "../lib/scoring";
import type { Combo, Profile } from "../types";
import { entryName } from "./Summary";

const same = (x: Combo, y: Combo) => x.a.name === y.a.name && x.b.name === y.b.name;

export function Recommend({ profile, top, pick, onPick }: { profile: Profile; top: Combo[]; pick: Combo; onPick: (c: Combo) => void }) {
  const rows = rankedTracks(profile).slice(0, 8);
  return (
    <section className="panel on" id="p-recommend">
      <div className="panel-head">
        <div>
          <h2>나에게 맞는 트랙 조합 Top 3</h2>
          <p>
            {entryName(profile)} 기준입니다.{" "}
            {profile.entry === "FREE" ? "1·2트랙 모두 전체 트랙에서 골랐어요." : `1트랙은 ${COLLEGES[profile.entry]} 안에서, 2트랙은 전체에서 골랐어요.`}
          </p>
        </div>
      </div>

      <div className="recs">
        {top.map((c, k) => {
          const sel = same(c, pick);
          return (
            <article key={c.a.name + c.b.name} className={`card rec${sel ? " sel" : ""}`}>
              <div className="rank">
                추천 {k + 1}순위{sel ? " · 선택됨" : ""}
              </div>
              <div className="tr">
                <span className="pill">1트랙</span>
                <h3>{c.a.name}</h3>
                <small>
                  {COLLEGES[c.a.col]} · 적합도 {toPoints(c.sa)}
                </small>
              </div>
              <div className="tr">
                <span className="pill b">2트랙</span>
                <h3>{c.b.name}</h3>
                <small>
                  {COLLEGES[c.b.col]} · 적합도 {toPoints(c.sb)}
                </small>
              </div>
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
              <button type="button" className={`btn${sel ? " ghost" : ""}`} onClick={() => onPick(c)}>
                {sel ? "로드맵 보기" : "이 조합으로 로드맵 만들기"}
              </button>
            </article>
          );
        })}
      </div>

      <div className="card top-list">
        <h3>트랙별 적합도 상위 8개</h3>
        <p className="hint">적합도 = 관심 분야 일치 50% + 희망 직무 일치 30% + 강점 일치 20%</p>
        <div className="scroll-x">
          <table>
            <thead>
              <tr>
                <th>트랙</th>
                <th>단과대학</th>
                <th>적합도</th>
                <th>
                  <span className="sr-only">막대</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.t.name}>
                  <td>{r.t.name}</td>
                  <td>{COLLEGES[r.t.col]}</td>
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

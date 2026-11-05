import { COLLEGES, EXTRA_GOAL } from "../data/tracks";
import type { Progress } from "../lib/roadmap";
import { toPoints } from "../lib/scoring";
import type { Combo, Profile } from "../types";

export const entryName = (p: Profile) => (p.entry === "FREE" ? "상상력인재학부 (유형 1)" : `${COLLEGES[p.entry]} (유형 2)`);

function Meter({ label, value, max, unit, tone }: { label: string; value: number; max: number; unit: string; tone: "a" | "b" | "x" }) {
  const w = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="meter-label">
        <span>{label}</span>
        <b>
          {value} / {max}
          {unit}
        </b>
      </div>
      <div className={`bar ${tone}`} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <i style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

export function Summary({ pick, profile, prog }: { pick: Combo; profile: Profile; prog: Progress }) {
  return (
    <section className="summary" aria-label="내 현황 요약">
      <div className="card">
        <h2>선택한 트랙 조합</h2>
        <div className="combo-line">
          <span className="pill">1트랙</span>
          {pick.a.name}
          <span className="plus">+</span>
          <span className="pill b">2트랙</span>
          {pick.b.name}
          <span className="pill n">{toPoints(pick.total)} / 110점</span>
        </div>
        <div className="profile-line">
          <span>{entryName(profile)}</span>
          <span>·</span>
          <span>
            {profile.year}학년 {profile.sem}학기
          </span>
          <span>·</span>
          <span>희망 직무: {profile.jobs.join(", ") || "미선택"}</span>
        </div>
      </div>
      <div className="card meters">
        <Meter label={`1트랙 과목 (${pick.a.name})`} value={prog.a.done} max={prog.a.total} unit="과목" tone="a" />
        <Meter label={`2트랙 과목 (${pick.b.name})`} value={prog.b.done} max={prog.b.total} unit="과목" tone="b" />
        <Meter label={`비교과포인트 (졸업요건 ${EXTRA_GOAL}pt)`} value={prog.extraPts} max={EXTRA_GOAL} unit="pt" tone="x" />
      </div>
    </section>
  );
}

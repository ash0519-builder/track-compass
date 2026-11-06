import { GRAD, liberalTotal } from "../data/rules";
import { findEntry, SEM_NAMES } from "../data/tracks";
import { admissionOf, nowIndex, semesterCredits, type Progress } from "../lib/roadmap";
import { toPoints } from "../lib/scoring";
import type { Combo, Profile, Roadmap } from "../types";

export const entryName = (p: Profile) => `${findEntry(p.entry).name} · ${p.day} · ${String(admissionOf(p)).slice(2)}학번`;

function Meter({ label, value, max, unit, tone }: { label: string; value: number; max: number; unit: string; tone: "a" | "b" | "g" | "x" }) {
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

export function Summary({ pick, profile, prog, roadmap }: { pick: Combo; profile: Profile; prog: Progress; roadmap: Roadmap }) {
  const now = nowIndex(profile);
  const cur = roadmap[now] ?? [];
  const credits = semesterCredits(cur);
  const pts = cur.filter((it) => it.kind === "x").reduce((s, it) => s + it.unit, 0);
  const carry = roadmap.flat().filter((it) => it.carryOf).length;
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
        <p className="now-line">
          <b>이번 학기({SEM_NAMES[now]}) 계획</b> 교과 {credits}학점 · 비교과 {pts}pt
          {credits > GRAD.semesterMax && <span className="warn"> · 기본 수강 한도 {GRAD.semesterMax}학점 초과</span>}
          {pts > GRAD.semesterCap && <span className="warn"> · 비교과는 학기당 {GRAD.semesterCap}pt까지 인정</span>}
          {carry > 0 && <span> · 다시 들을 과목 {carry}개</span>}
        </p>
      </div>
      <div className="card meters">
        <Meter label="1트랙 전공" value={prog.a} max={GRAD.perTrack} unit="학점" tone="a" />
        <Meter label="2트랙 전공" value={prog.b} max={GRAD.perTrack} unit="학점" tone="b" />
        <Meter label="교양" value={prog.liberal} max={liberalTotal(admissionOf(profile))} unit="학점" tone="g" />
        <Meter label="비교과포인트" value={prog.extraPts} max={GRAD.extraPoints} unit="pt" tone="x" />
      </div>
    </section>
  );
}

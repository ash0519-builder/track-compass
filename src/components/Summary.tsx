import { GRAD, liberalTotal, MODE_RULES } from "../data/rules";
import { findEntry, SEM_NAMES } from "../data/tracks";
import { admissionOf, nowIndex, semesterCredits, type Progress } from "../lib/roadmap";
import { gpaOf } from "../lib/learning";
import { planParts } from "../lib/plan";
import { toPoints } from "../lib/scoring";
import type { Plan, Profile, Roadmap } from "../types";

export const entryName = (p: Profile) => `${findEntry(p.entry).name} · ${p.day} · ${String(admissionOf(p)).slice(2)}학번`;

function Meter({ label, value, max, unit, tone }: { label: string; value: number; max: number; unit: string; tone: "a" | "b" | "g" | "f" | "x" }) {
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

function PlanLine({ plan }: { plan: Plan }) {
  if (plan.mode === "fusion1" && plan.combo)
    return (
      <div className="combo-line">
        <span className="pill">1트랙</span>
        {plan.a.name}
        <span className="plus">+</span>
        <span className="pill b">2트랙</span>
        {plan.b!.name}
        <span className="pill n">{toPoints(plan.combo.total)} / 110점</span>
      </div>
    );
  if (plan.mode === "fusion2")
    return (
      <div className="combo-line">
        <span className="pill">학과</span>
        {plan.a.name}
        <span className="plus">+</span>
        <span className="pill b">부전공</span>
        {plan.b!.name}
        <span className="pill n">{MODE_RULES.fusion2.name}</span>
      </div>
    );
  if (plan.mode === "deep")
    return (
      <div className="combo-line">
        <span className="pill">학과</span>
        {plan.a.name}
        <span className="pill n">{MODE_RULES.deep.name} · 제2트랙 없음</span>
      </div>
    );
  return (
    <div className="combo-line">
      <span className="pill">1트랙</span>
      {plan.a.name}
      <span className="plus">+</span>
      <span className="pill b">2트랙</span>
      <span className="muted">미정</span>
    </div>
  );
}

export function Summary({
  plan,
  profile,
  prog,
  roadmap,
  outside = [],
}: {
  plan: Plan;
  profile: Profile;
  prog: Progress;
  roadmap: Roadmap;
  outside?: { name: string; credit: number }[];
}) {
  const gpa = gpaOf(profile.taken ?? []);
  const free = prog.free + outside.reduce((s, x) => s + x.credit, 0);
  const now = nowIndex(profile);
  const cur = roadmap[now] ?? [];
  const credits = semesterCredits(cur);
  const pts = cur.filter((it) => it.kind === "x").reduce((s, it) => s + it.unit, 0);
  const carry = roadmap.flat().filter((it) => it.carryOf).length;
  return (
    <section className="summary" aria-label="내 현황 요약">
      <div className="card">
        <h2>{plan.mode === "fusion1" ? "선택한 트랙 조합" : "선택한 전공 계획"}</h2>
        <PlanLine plan={plan} />
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
        {profile.taken?.length ? (
          <p className="now-line learn-line">
            <b>학습 데이터</b> {profile.taken.length}과목 · 평균 평점 {gpa ?? "-"} / 4.5 · 추천에 35% 반영
          </p>
        ) : null}
      </div>
      <div className="card meters">
        {planParts(plan).map((x) => (
          <Meter key={x.kind} label={x.spec.label === "1트랙" || x.spec.label === "2트랙" ? `${x.spec.label} 전공` : x.spec.label} value={x.kind === "a" ? prog.a : prog.b} max={x.spec.total} unit="학점" tone={x.kind} />
        ))}
        {plan.mode === "undecided" && (
          <div className="meter-label pending">
            <span>2트랙 전공</span>
            <b>미정 · 정하면 {GRAD.perTrack}학점 추가</b>
          </div>
        )}
        <Meter label="교양" value={prog.liberal} max={liberalTotal(admissionOf(profile))} unit="학점" tone="g" />
        <Meter label="자유선택" value={free} max={GRAD.free} unit="학점" tone="f" />
        <Meter label="비교과포인트" value={prog.extraPts} max={GRAD.extraPoints} unit="pt" tone="x" />
      </div>
    </section>
  );
}

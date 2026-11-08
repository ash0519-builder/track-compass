import { useState, type FormEvent } from "react";
import { ADMISSION_YEARS, CURRENT_YEAR } from "../data/rules";
import { ENTRIES, findEntry, TAG_LABELS, TAG_LIMITS, TAGS, type TagGroup } from "../data/tracks";
import { admissionOf } from "../lib/roadmap";
import { THEMES } from "../lib/programs";
import type { DayNight, Profile } from "../types";
import { LearningInput } from "./LearningInput";
import { Tip } from "./Tip";

const GROUPS: TagGroup[] = ["interests", "jobs", "strengths"];

export function Diagnose({ profile, sample = false, onSubmit }: { profile: Profile; sample?: boolean; onSubmit: (p: Profile) => void }) {
  // 예시 학생의 학습 데이터는 내 진단으로 넘어오지 않게 비워 둔다
  const [draft, setDraft] = useState<Profile>({ ...profile, admission: admissionOf(profile), taken: sample ? [] : profile.taken });
  const [warn, setWarn] = useState("");
  const ok = draft.interests.length > 0 && draft.jobs.length > 0;
  const entry = findEntry(draft.entry);

  function toggle(group: TagGroup, tag: string) {
    const cur = draft[group];
    if (cur.includes(tag)) {
      setDraft({ ...draft, [group]: cur.filter((t) => t !== tag) });
      setWarn("");
      return;
    }
    if (cur.length >= TAG_LIMITS[group]) {
      setWarn(`${TAG_LABELS[group]}는 최대 ${TAG_LIMITS[group]}개까지 고를 수 있어요.`);
      return;
    }
    setDraft({ ...draft, [group]: [...cur, tag] });
    setWarn("");
  }

  function changeEntry(id: string) {
    const e = findEntry(id);
    setDraft({ ...draft, entry: id, day: e.days.includes(draft.day) ? draft.day : e.days[0] });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (ok) onSubmit(draft);
  }

  return (
    <section className="panel" id="p-diagnose">
      <div className="panel-head">
        <div>
          <h2>진로·학습 진단</h2>
          <p>흥미(관심 분야·희망 직무·강점)와 학습 데이터(들은 과목·성적)로 맞춤 전공을 추천해요. 제1트랙은 입학한 모집단위 안에서 골라야 해서 모집단위와 주·야를 먼저 정확히 골라주세요.</p>
        </div>
      </div>
      <Tip>1학년 1학기라 들은 과목이 없으면 흥미만으로 추천해요. 성적을 넣으면 들은 과목이 많은 트랙, 성적이 좋은 과목의 트랙에 점수를 더 줘요.</Tip>
      <form className="form-grid" onSubmit={submit}>
        <div className="row4">
          <label className="f" htmlFor="entry">
            입학 모집단위
            <select id="entry" value={draft.entry} onChange={(e) => changeEntry(e.target.value)}>
              {ENTRIES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label className="f" htmlFor="day">
            주·야
            <select id="day" value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value as DayNight })}>
              {entry.days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="f" htmlFor="year">
            학년
            <select
              id="year"
              value={draft.year}
              onChange={(e) => {
                const year = Number(e.target.value);
                setDraft({ ...draft, year, admission: CURRENT_YEAR - (year - 1) });
              }}
            >
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>
                  {y}학년
                </option>
              ))}
            </select>
          </label>
          <label className="f" htmlFor="sem">
            학기
            <select id="sem" value={draft.sem} onChange={(e) => setDraft({ ...draft, sem: Number(e.target.value) })}>
              <option value={1}>1학기</option>
              <option value={2}>2학기</option>
            </select>
          </label>
        </div>
        <div className="row4">
          <label className="f" htmlFor="admission">
            입학년도(학번)
            <select id="admission" value={draft.admission} onChange={(e) => setDraft({ ...draft, admission: Number(e.target.value) })}>
              {ADMISSION_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}년 입학 ({String(y).slice(2)}학번)
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint">
          학번에 따라 교양 졸업학점이 달라요(24학번 이후 31학점, 19~23학번 28학점). 휴학·편입했다면 실제 학번을 골라주세요. 예술학부(실기 전공)와 글로벌인재대학은 트랙 선택 방식이 달라
          목록에서 뺐어요.
        </p>

        {GROUPS.map((g) => (
          <fieldset key={g}>
            <legend>
              {TAG_LABELS[g]}
              <small>최대 {TAG_LIMITS[g]}개</small>
            </legend>
            <div className="chips">
              {TAGS[g].map((t, k) => (
                <button type="button" key={t} id={`chip-${g}-${k}`} className="chip" aria-pressed={draft[g].includes(t)} onClick={() => toggle(g, t)}>
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        <LearningInput draft={draft} setDraft={setDraft} />

        <fieldset>
          <legend>
            비교과로 키우고 싶은 분야<small>선택 · 최대 3개</small>
          </legend>
          <div className="chips">
            {THEMES.filter((t) => t.id !== "major").map((t) => {
              const cur = draft.extraThemes ?? [];
              const on = cur.includes(t.id);
              return (
                <button
                  type="button"
                  key={t.id}
                  id={`chip-theme-${t.id}`}
                  className="chip"
                  aria-pressed={on}
                  onClick={() => setDraft({ ...draft, extraThemes: on ? cur.filter((x) => x !== t.id) : [...cur, t.id].slice(-3) })}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="actions">
          <button type="submit" className="btn" id="diagSubmit" disabled={!ok}>
            {draft.taken?.length ? "학습 데이터와 함께 추천 받기" : "추천 받기"}
          </button>
          <span className="hint" role="status">
            {warn || (ok ? `선택: 관심 ${draft.interests.length} · 직무 ${draft.jobs.length} · 강점 ${draft.strengths.length}` : "관심 분야와 희망 직무를 하나 이상 골라주세요.")}
          </span>
        </div>
      </form>
    </section>
  );
}

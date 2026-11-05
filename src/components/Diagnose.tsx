import { useState, type FormEvent } from "react";
import { COLLEGES, TAG_LABELS, TAG_LIMITS, TAGS, type TagGroup } from "../data/tracks";
import type { CollegeKey, Entry, Profile } from "../types";

const GROUPS: TagGroup[] = ["interests", "jobs", "strengths"];

export function Diagnose({ profile, onSubmit }: { profile: Profile; onSubmit: (p: Profile) => void }) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [warn, setWarn] = useState("");
  const ok = draft.interests.length > 0 && draft.jobs.length > 0;

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

  function submit(e: FormEvent) {
    e.preventDefault();
    if (ok) onSubmit(draft);
  }

  return (
    <section className="panel on" id="p-diagnose">
      <div className="panel-head">
        <div>
          <h2>나에 대해 알려주세요</h2>
          <p>입학 모집단위에 따라 1트랙을 고를 수 있는 범위가 달라집니다. 분야·직무·강점은 여러 개 고를 수 있어요.</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <div className="row3">
          <label className="f" htmlFor="entry">
            입학 모집단위
            <select id="entry" value={draft.entry} onChange={(e) => setDraft({ ...draft, entry: e.target.value as Entry })}>
              <option value="FREE">상상력인재학부 (유형 1: 모든 트랙에서 선택)</option>
              {(Object.keys(COLLEGES) as CollegeKey[]).map((k) => (
                <option key={k} value={k}>
                  {COLLEGES[k]} (유형 2: 1트랙은 단과대학 안에서)
                </option>
              ))}
            </select>
          </label>
          <label className="f" htmlFor="year">
            학년
            <select id="year" value={draft.year} onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })}>
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

        {GROUPS.map((g) => (
          <fieldset key={g}>
            <legend>
              {TAG_LABELS[g]}
              <small>최대 {TAG_LIMITS[g]}개</small>
            </legend>
            <div className="chips">
              {TAGS[g].map((t, k) => (
                <button
                  type="button"
                  key={t}
                  id={`chip-${g}-${k}`}
                  className="chip"
                  aria-pressed={draft[g].includes(t)}
                  onClick={() => toggle(g, t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="actions">
          <button type="submit" className="btn" id="diagSubmit" disabled={!ok}>
            추천 받기
          </button>
          <span className="hint" role="status">
            {warn ||
              (ok
                ? `선택: 관심 ${draft.interests.length} · 직무 ${draft.jobs.length} · 강점 ${draft.strengths.length}`
                : "관심 분야와 희망 직무를 하나 이상 골라주세요.")}
          </span>
        </div>
      </form>
    </section>
  );
}

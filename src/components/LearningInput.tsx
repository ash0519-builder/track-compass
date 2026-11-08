import { useState } from "react";
import { TAG_LIMITS } from "../data/tracks";
import { CATALOG_NAMES, creditOf, earnedCredits, GRADES, gpaOf, interestsFromCourses, lookupCourse, parseTranscript } from "../lib/learning";
import { normName } from "../lib/text";
import type { Grade, Profile, TakenCourse } from "../types";
import { Tip } from "./Tip";

const SAMPLE = [
  "2025 1학기 교양필수 사고와 표현 3 A0",
  "2025 1학기 교양필수 AI와 SW 기초 3 A+",
  "2025 1학기 전공기초 웹프로그래밍기초 3 B+",
  "2025 2학기 교양필수 영어커뮤니케이션(청취·회화) 2 B0",
  "2025 2학기 전공기초 컴퓨터프로그래밍 3 A+",
  "2025 2학기 일반선택 생활 속의 심리학 3 A0",
].join("\n");

/** 학습 데이터 입력: 성적표 붙여넣기 + 과목 직접 추가 */
export function LearningInput({ draft, setDraft }: { draft: Profile; setDraft: (p: Profile) => void }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<Grade>("A0");
  const taken = draft.taken ?? [];
  const gpa = gpaOf(taken);
  const tags = interestsFromCourses(taken).slice(0, 4);

  const set = (list: TakenCourse[]) => setDraft({ ...draft, taken: list.slice(0, 120) });
  const merge = (add: TakenCourse[]) => {
    const m = new Map(taken.map((c) => [normName(c.name), c]));
    for (const c of add) m.set(normName(c.name), c);
    set([...m.values()]);
  };

  function read() {
    const r = parseTranscript(text);
    if (!r.courses.length) {
      setMsg("과목과 성적을 찾지 못했어요. 과목명과 성적(A+, B0 등)이 한 줄에 같이 있는지 확인해 주세요.");
      return;
    }
    merge(r.courses);
    const found = r.courses.length - r.unknown.length;
    setMsg(`과목 ${r.courses.length}개를 읽었어요. 교육과정에서 찾은 과목 ${found}개${r.unknown.length ? `, 직접 입력으로 넣은 과목 ${r.unknown.length}개` : ""}.`);
    setText("");
  }

  function add() {
    const nm = name.trim();
    if (nm.length < 2) return;
    merge([{ name: lookupCourse(nm)?.name ?? nm, grade }]);
    setName("");
  }

  return (
    <fieldset className="learning" id="learning">
      <legend>
        학습 데이터<small>선택 · 들은 과목과 성적을 넣으면 전공 추천과 로드맵에 반영해요</small>
      </legend>
      <Tip>
        종합정보시스템 성적 조회 화면의 표를 드래그해 복사(Ctrl+C)한 뒤 아래 칸에 붙여넣으세요. 과목명과 성적만 골라 읽고, 입력한 내용은 이 기기에만 저장돼요.
      </Tip>
      <label className="f" htmlFor="transcript">
        성적표 붙여넣기
        <textarea id="transcript" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={"예) 2025 1학기 전공기초 컴퓨터프로그래밍 3 A+\n예) 사고와 표현  3  A0"} />
      </label>
      <div className="learn-actions">
        <button type="button" className="btn ghost" id="readTranscript" disabled={!text.trim()} onClick={read}>
          성적표 읽기
        </button>
        <button type="button" className="link-btn" onClick={() => setText(SAMPLE)}>
          예시 성적표 넣어보기
        </button>
        {msg && (
          <span className="hint" role="status">
            {msg}
          </span>
        )}
      </div>

      <div className="learn-add">
        <label className="f grow" htmlFor="courseName">
          과목 직접 추가
          <input id="courseName" list="course-names" value={name} onChange={(e) => setName(e.target.value)} placeholder="과목명 (예: 자료구조)" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        </label>
        <datalist id="course-names">
          {CATALOG_NAMES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <label className="f" htmlFor="courseGrade">
          성적
          <select id="courseGrade" value={grade} onChange={(e) => setGrade(e.target.value as Grade)}>
            {GRADES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn ghost" id="addCourse" disabled={name.trim().length < 2} onClick={add}>
          추가
        </button>
      </div>

      {taken.length > 0 && (
        <>
          <div className="learn-sum">
            <b>{taken.length}과목</b> · 이수 {earnedCredits(taken)}학점 · 평균 평점 <b>{gpa ?? "-"}</b> / 4.5
            <button type="button" className="link-btn" onClick={() => (set([]), setMsg(""))}>
              모두 지우기
            </button>
          </div>
          {tags.length > 0 && (
            <div className="learn-tags">
              <span className="hint">수강 과목으로 본 관심 분야:</span>
              {tags.map((t) => {
                const on = draft.interests.includes(t.tag);
                const full = draft.interests.length >= TAG_LIMITS.interests;
                return (
                  <button
                    key={t.tag}
                    type="button"
                    className="chip small"
                    aria-pressed={on}
                    disabled={!on && full}
                    title={on ? "관심 분야에 들어 있어요" : "관심 분야에 추가"}
                    onClick={() => !on && setDraft({ ...draft, interests: [...draft.interests, t.tag] })}
                  >
                    {t.tag} {t.credits}학점{on ? " ✓" : " +"}
                  </button>
                );
              })}
            </div>
          )}
          <ul className="taken-list">
            {taken.map((c, k) => {
              const known = !!lookupCourse(c.name);
              return (
                <li key={c.name} className={c.grade === "F" || c.grade === "NP" ? "fail" : ""}>
                  <span className="nm">
                    {c.name}
                    {!known && <small> (교육과정에 없는 과목 · 자유선택)</small>}
                  </span>
                  <span className="cr">{creditOf(c)}학점</span>
                  <label className="sr-only" htmlFor={`g-${k}`}>
                    {c.name} 성적
                  </label>
                  <select id={`g-${k}`} value={c.grade} onChange={(e) => set(taken.map((x, j) => (j === k ? { ...x, grade: e.target.value as Grade } : x)))}>
                    {GRADES.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                  <button type="button" className="x" aria-label={`${c.name} 빼기`} onClick={() => set(taken.filter((_, j) => j !== k))}>
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </fieldset>
  );
}

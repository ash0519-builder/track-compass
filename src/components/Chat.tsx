import { useEffect, useRef, useState, type FormEvent } from "react";
import { answer, SUGGESTIONS, type AdvisorContext } from "../lib/advisor";
import { planTitle } from "../lib/plan";

interface Msg {
  who: "me" | "bot";
  text: string;
}

export function Chat({ ctx }: { ctx: AdvisorContext }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    { who: "bot", text: `안녕하세요. ${planTitle(ctx.plan)} 계획으로 로드맵을 만들었어요. 궁금한 걸 물어보세요.` },
    { who: "me", text: "이번 학기에 뭐 해야 해?" },
    { who: "bot", text: answer("이번 학기에 뭐 해야 해?", ctx) },
  ]);
  const [input, setInput] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [msgs]);

  function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    setMsgs((m) => [...m, { who: "me", text }, { who: "bot", text: answer(text, ctx) }]);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    ask(input);
    setInput("");
  }

  return (
    <section className="panel" id="p-chat">
      <div className="panel-head">
        <div>
          <h2>AI 상담</h2>
          <p>한성대 공식 교육과정·학사 제도 데이터와 내 로드맵을 근거로 답해요. 트랙 변경이나 신청 일정은 학사 공지로 한 번 더 확인하세요.</p>
        </div>
      </div>
      <div className="chat card">
        <div className="msgs" ref={box} aria-live="polite">
          {msgs.map((m, k) => (
            <div key={k} className={`msg ${m.who}`}>
              {m.who === "bot" && <span className="who">트랙 나침반</span>}
              {m.text}
            </div>
          ))}
        </div>
        <div className="suggest">
          {SUGGESTIONS.map((s, k) => (
            <button key={s} id={`sg-${k}`} type="button" className="chip" onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
        <form className="ask" onSubmit={submit}>
          <label htmlFor="askInput" className="sr-only">
            질문 입력
          </label>
          <input id="askInput" autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} placeholder="예: 빅데이터트랙으로 바꾸면 어떻게 돼?" />
          <button className="btn" type="submit">
            보내기
          </button>
        </form>
      </div>
    </section>
  );
}

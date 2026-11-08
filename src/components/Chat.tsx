import { useEffect, useRef, useState, type FormEvent } from "react";
import { aiPrompt, answer, SUGGESTIONS, type AdvisorContext } from "../lib/advisor";
import { Tip } from "./Tip";
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
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
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
          <h2>상담</h2>
          <p>질문을 규칙(정규식)으로 알아듣고, 한성대 공식 교육과정·학사 제도 데이터와 내 로드맵을 근거로 답해요. 같은 질문에는 늘 같은 답을 하고, 입력한 정보는 밖으로 보내지 않아요.</p>
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

      <div className="card ai-copy">
        <h3>더 자유롭게 물어보고 싶다면: AI 챗봇용 요약</h3>
        <Tip>내 진단 결과·학습 데이터·로드맵을 한 번에 정리한 글이에요. 복사해서 쓰고 싶은 AI 챗봇에 붙여넣으면 돼요. 성적이 들어 있으니 붙여넣기 전에 내용을 확인하세요.</Tip>
        {!summary ? (
          <button type="button" className="btn ghost" id="makePrompt" onClick={() => setSummary(aiPrompt(ctx))}>
            요약 만들기
          </button>
        ) : (
          <>
            <textarea id="aiPrompt" readOnly rows={10} value={summary} onFocus={(e) => e.currentTarget.select()} />
            <div className="learn-actions">
              <button
                type="button"
                className="btn"
                id="copyPrompt"
                onClick={() => {
                  const done = () => setCopied(true);
                  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(summary).then(done, () => fallbackCopy(summary) && done());
                  else if (fallbackCopy(summary)) done();
                }}
              >
                복사하기
              </button>
              {copied && (
                <span className="hint" role="status">
                  복사했어요.
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function fallbackCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

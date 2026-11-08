import type { ReactNode } from "react";

/** 화면마다 붙는 짧은 도움말 (안내 캐릭터 이미지를 넣을 자리) */
export function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="tip" role="note">
      <span className="tip-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M14.8 9.2 13 13l-3.8 1.8L11 11z" fill="currentColor" />
        </svg>
        TIP
      </span>
      <p>{children}</p>
    </div>
  );
}

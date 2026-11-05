/** 마지막 글자에 받침이 있는지 (한글이 아니면 false) */
export function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0;
}

export const eul = (w: string) => (hasBatchim(w) ? "을" : "를");
export const eun = (w: string) => (hasBatchim(w) ? "은" : "는");

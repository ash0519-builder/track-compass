/** 과목명 비교용: 공백·괄호·가운뎃점 등을 빼고 로마숫자를 아라비아 숫자로 */
export function normName(s: string): string {
  return s
    .replace(/Ⅰ/g, "1")
    .replace(/Ⅱ/g, "2")
    .replace(/Ⅲ/g, "3")
    .replace(/[\s()（）[\]{}·ㆍ.,:;\-_/&'"“”‘’]/g, "")
    .toLowerCase();
}

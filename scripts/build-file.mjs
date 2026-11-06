// 빌드 결과(dist/)를 HTML 파일 하나로 합칩니다.
// 인터넷 없이 더블클릭만으로 실행되는 제출용 파일을 만들 때 사용합니다.
//   npm run build && npm run build:file
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const dist = process.argv[2] ?? "dist";
const out = process.argv[3] ?? "release/트랙나침반_eAdvisor.html";

// "/track-compass/assets/x.js", "./assets/x.js", "/favicon.svg" → dist 안의 실제 경로
const local = (href) => join(dist, href.replace(/^(\.\/|\/track-compass\/|\/)/, ""));

let html = readFileSync(join(dist, "index.html"), "utf8");

html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const js = readFileSync(local(src), "utf8").replace(/<\/script/gi, "<\\/script");
  return `<script type="module">${js}</script>`;
});

html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (tag, href) => {
  if (/^https?:/.test(href)) return tag; // 웹폰트는 온라인일 때만 적용, 오프라인이면 기본 글꼴 사용
  return `<style>${readFileSync(local(href), "utf8")}</style>`;
});

html = html.replace(/<link\b[^>]*rel="icon"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => {
  const svg = readFileSync(local(href)).toString("base64");
  return `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${svg}" />`;
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`만들었어요: ${out} (${Math.round(html.length / 1024)}KB)`);

import type { Plan, PptSlide } from "./types";

interface HtmlSlide {
  kind: "cover" | "lesson" | "board";
  title: string;
  kicker: string;
  minutes?: number;
  activity?: string;
  question?: string;
  conclusion?: string;
  mnemonic?: string;
  teacherNote?: string;
  visualHint?: string;
  lines?: string[];
}

function slideFromDeck(slide: PptSlide): HtmlSlide {
  return {
    kind: "lesson",
    title: slide.title,
    kicker: slide.kicker ?? "",
    minutes: slide.minutes,
    activity: slide.activity,
    question: slide.question,
    conclusion: slide.conclusion,
    mnemonic: slide.mnemonic,
    teacherNote: slide.teacherNote,
    visualHint: slide.visualHint,
  };
}

function buildSlides(plan: Plan): HtmlSlide[] {
  const slides: HtmlSlide[] = [
    {
      kind: "cover",
      title: plan.meta.lesson,
      kicker: `${plan.meta.grade}${plan.meta.subject} · ${plan.meta.textbook} · ${plan.conditions.minutes} 分钟`,
      activity: plan.content.objectives[0] ?? "",
    },
  ];
  const flow = plan.ppt?.slides.filter(
    (slide) =>
      slide.kind === "lesson" &&
      slide.activity &&
      !(slide.kicker ?? "").includes("答对得星"),
  );
  if (flow && flow.length > 0) {
    slides.push(...flow.map(slideFromDeck));
  } else {
    slides.push(
      ...plan.content.process.map((stage) => ({
        kind: "lesson" as const,
        title: stage.stage,
        kicker: `${stage.minutes} 分钟`,
        minutes: stage.minutes,
        activity: stage.student,
        question: "",
        conclusion: "",
        mnemonic: "",
        teacherNote: [stage.teacher, stage.fallback].filter(Boolean).join("\n"),
        visualHint: "",
      })),
    );
  }
  slides.push({
    kind: "board",
    title: "板书设计",
    kicker: "课末回看 · 一屏收束",
    lines: plan.content.boardDesign,
  });
  return slides;
}

function safeName(text: string): string {
  return text.replace(/[\\/:*?"<>|]/g, "-");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildHtmlCourseware(plan: Plan): string {
  const slides = buildSlides(plan);
  const data = {
    title: plan.meta.lesson,
    grade: plan.meta.grade,
    subject: plan.meta.subject,
    author: plan.authorName,
    minutes: plan.conditions.minutes,
    slides,
  };
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(plan.meta.lesson)} · 单文件课件</title>
<style>
:root{--ink:#22301f;--muted:#6b7468;--paper:#f6f1e4;--card:#fffdf6;--green:#2e5a3c;--gold:#d9ae6a;--red:#a6462e}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--paper);color:var(--ink);font-family:"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif;display:flex;flex-direction:column;overflow:hidden}
.top{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #e2d8c2;background:rgba(255,253,246,.9)}
.brand{font-weight:800;color:var(--green);letter-spacing:.1em}
.meta{font-size:12px;color:var(--muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top button{border:1px solid #d8cbb0;background:transparent;border-radius:999px;padding:4px 10px;font-size:12px;color:var(--green);cursor:pointer}
main{flex:1;display:flex;align-items:center;justify-content:center;padding:clamp(12px,3vw,32px);min-height:0}
.card{width:min(1100px,100%);height:100%;max-height:100%;background:var(--card);border-radius:18px;box-shadow:0 18px 50px -30px rgba(34,48,31,.55);padding:clamp(18px,4vw,46px);display:flex;flex-direction:column;gap:14px;overflow:auto}
.card.cover{justify-content:center;background:linear-gradient(140deg,var(--card) 55%,#f2e7cc)}
.card.board{background:#203a2b;color:#eef1e2}
.kicker{font-size:clamp(11px,1.4vw,14px);color:var(--red);font-weight:700;letter-spacing:.08em}
.card.board .kicker{color:var(--gold)}
h1{font-size:clamp(24px,4.6vw,48px);line-height:1.2;margin:0}
h1.small{font-size:clamp(20px,3.2vw,34px)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.block{border:1px solid #e2d8c2;border-radius:12px;padding:12px 14px;background:#fff}
.block h2{margin:0 0 6px;font-size:12px;color:var(--green);letter-spacing:.12em}
.block p{margin:0;font-size:clamp(15px,2.1vw,22px);line-height:1.55}
.block.ask{border-left:4px solid var(--red)}
.block.result{background:#eef3e6;border-color:transparent}
.block.result p{font-weight:700;color:var(--green)}
.block.mnemonic{background:#f7edd8}
.hint{font-size:clamp(13px,1.8vw,18px);color:var(--muted);line-height:1.6}
.cover-sub{font-size:clamp(16px,2.4vw,24px);color:var(--muted);max-width:48ch}
.board ul{margin:0;padding-left:1.2em;font-size:clamp(15px,2.2vw,24px);line-height:1.8}
.note{display:none;border-top:1px dashed #d8cbb0;padding-top:10px;font-size:clamp(12px,1.6vw,16px);color:var(--muted);white-space:pre-wrap}
body.show-notes .note{display:block}
footer{display:flex;align-items:center;justify-content:center;gap:16px;padding:10px 16px 16px}
footer button{border:1px solid #d8cbb0;background:var(--card);border-radius:999px;padding:7px 16px;font-size:13px;color:var(--green);cursor:pointer}
footer button:disabled{opacity:.35;cursor:default}
.count{font-variant-numeric:tabular-nums;font-size:13px;color:var(--muted);min-width:76px;text-align:center}
.progress{height:4px;background:#e7ddc8}
.progress i{display:block;height:100%;width:0;background:var(--green);transition:width .25s}
@media (max-width:720px){.grid{grid-template-columns:1fr}.card{height:auto;min-height:100%}main{align-items:flex-start}}
</style>
</head>
<body>
<header class="top">
  <span class="brand">乡课</span>
  <span class="meta">${escapeHtml(plan.meta.lesson)} · ${escapeHtml(plan.meta.grade)}${escapeHtml(plan.meta.subject)} · 单文件课件</span>
  <button id="notesBtn" type="button">备注</button>
  <button id="fullBtn" type="button">全屏</button>
</header>
<div class="progress"><i id="progress"></i></div>
<main><div id="stage"></div></main>
<footer>
  <button id="prev" type="button">上一页</button>
  <span class="count" id="count"></span>
  <button id="next" type="button">下一页</button>
</footer>
<script>
const data = ${payload};
const stage = document.getElementById('stage');
const count = document.getElementById('count');
const progress = document.getElementById('progress');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
let index = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function block(label, text, extra) {
  if (!text) return null;
  const wrap = el('section', 'block' + (extra ? ' ' + extra : ''));
  wrap.appendChild(el('h2', '', label));
  wrap.appendChild(el('p', '', text));
  return wrap;
}

function render() {
  const slide = data.slides[index];
  stage.innerHTML = '';
  const card = el('article', 'card ' + slide.kind);
  if (slide.kicker) card.appendChild(el('div', 'kicker', slide.kicker));
  card.appendChild(el('h1', slide.kind === 'cover' ? '' : 'small', slide.title));
  if (slide.kind === 'cover' && slide.activity) card.appendChild(el('p', 'cover-sub', slide.activity));
  if (slide.kind === 'board') {
    const list = el('ul');
    (slide.lines || []).forEach((line) => list.appendChild(el('li', '', line)));
    card.appendChild(list);
  } else {
    const grid = el('div', 'grid');
    const activity = block('做一做', slide.activity);
    const question = block('想一想', slide.question, 'ask');
    const conclusion = block('说一说', slide.conclusion, 'result');
    const mnemonic = block('口诀 / 板书', slide.mnemonic, 'mnemonic');
    [activity, question, conclusion, mnemonic].forEach((item) => { if (item) grid.appendChild(item); });
    if (grid.children.length) card.appendChild(grid);
    if (slide.visualHint) card.appendChild(el('p', 'hint', '图解：' + slide.visualHint));
  }
  if (slide.teacherNote) card.appendChild(el('div', 'note', '教师备注（按 N 显示 / 隐藏）：\\n' + slide.teacherNote));
  stage.appendChild(card);
  count.textContent = (index + 1) + ' / ' + data.slides.length;
  progress.style.width = ((index + 1) / data.slides.length * 100) + '%';
  prev.disabled = index === 0;
  next.disabled = index === data.slides.length - 1;
}

function go(delta) {
  index = Math.max(0, Math.min(data.slides.length - 1, index + delta));
  render();
}

prev.addEventListener('click', () => go(-1));
next.addEventListener('click', () => go(1));
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') go(-1);
  if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') go(1);
  if (event.key.toLowerCase() === 'n') document.body.classList.toggle('show-notes');
  if (event.key.toLowerCase() === 'f') document.documentElement.requestFullscreen?.();
});
document.getElementById('notesBtn').addEventListener('click', () => document.body.classList.toggle('show-notes'));
document.getElementById('fullBtn').addEventListener('click', () => document.documentElement.requestFullscreen?.());
render();
</script>
</body>
</html>`;
}

export function downloadHtmlCourseware(plan: Plan): string {
  const html = buildHtmlCourseware(plan);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `${safeName(plan.meta.lesson)}_单文件课件.html`;
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return fileName;
}

export function openHtmlCourseware(plan: Plan): boolean {
  const html = buildHtmlCourseware(plan);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(url);
    return false;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

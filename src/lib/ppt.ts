import type { LessonMeta, PptBrief, PptDeck } from "./types";

export interface PptExportResult {
  fileName: string;
}

function deckFileName(deck: PptDeck): string {
  const safeName = `${deck.subtitle} · ${deck.title}`.replace(/[\\/:*?"<>|]/g, "-");
  return `乡课-${safeName}.html`;
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface DeckGenerateInput {
  meta: LessonMeta;
  brief: PptBrief;
  author: string;
  school: string;
  /** 输入框里的额外要求，例如页数、例子、活动形式 */
  requirement?: string;
}

/** 调用后端 DeepSeek 接口生成课件结构；失败时由调用方回退本地规则。 */
export async function generateDeckViaServer(input: DeckGenerateInput): Promise<PptDeck> {
  const response = await fetch("/api/ppt/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const data = (await response.json()) as { error?: string; message?: string };
      detail = data.message || data.error || "";
    } catch {
      // 忽略非 JSON 错误体
    }
    throw new Error(detail || `课件生成服务返回 ${response.status}`);
  }
  const data = (await response.json()) as { deck?: PptDeck };
  const deck = data.deck;
  if (!deck || !Array.isArray(deck.slides) || deck.slides.length === 0) {
    throw new Error("课件生成服务返回空内容");
  }
  return deck;
}

/** 取回服务端渲染好的 guizang HTML，用于页面内预览。 */
export async function fetchDeckHtml(deck: PptDeck): Promise<string> {
  const fileName = deckFileName(deck);
  const response = await fetch("/api/ppt/export-html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deck, fileName }),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const data = (await response.json()) as { error?: string };
      detail = data.error || "";
    } catch {
      // 忽略非 JSON 错误体
    }
    throw new Error(detail || `HTML 导出服务返回 ${response.status}`);
  }
  const page = await response.text();
  if (!page) {
    throw new Error("HTML 导出服务返回空文件");
  }
  return page;
}

/** 调用服务端把 deck 渲染为 guizang 风格单文件 HTML 并下载。 */
export async function exportHtmlDeck(deck: PptDeck): Promise<PptExportResult> {
  const fileName = deckFileName(deck);
  const page = await fetchDeckHtml(deck);
  saveBlob(new Blob([page], { type: "text/html;charset=utf-8" }), fileName);
  return { fileName };
}

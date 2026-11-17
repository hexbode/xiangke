import type { LessonMeta, PptBrief, PptDeck } from "./types";

const COLORS = {
  paper: "F6F1E4",
  ink: "20301F",
  green: "2E5A3C",
  greenDeep: "1F3A2A",
  gold: "E0B974",
  muted: "79715F",
  chalk: "EEF1E2",
  red: "A6462E",
};

export interface PptExportResult {
  fileName: string;
  source: "server" | "local";
}

function deckFileName(deck: PptDeck): string {
  const safeName = `${deck.subtitle} · ${deck.title}`.replace(/[\\/:*?"<>|]/g, "-");
  return `乡课-${safeName}.pptx`;
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

async function requestServerPptx(deck: PptDeck, fileName: string): Promise<Blob> {
  const response = await fetch("/api/ppt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deck, fileName }),
  });
  if (!response.ok) {
    throw new Error(`python-pptx 服务返回 ${response.status}`);
  }
  const blob = await response.blob();
  if (!blob.size) {
    throw new Error("python-pptx 服务返回空文件");
  }
  return blob;
}

export interface DeckGenerateInput {
  meta: LessonMeta;
  brief: PptBrief;
  author: string;
  school: string;
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

/** 优先调用服务端 python-pptx 生成；服务不可用时回退到本地 pptxgenjs。 */
export async function exportPptx(deck: PptDeck): Promise<PptExportResult> {
  const fileName = deckFileName(deck);
  try {
    const blob = await requestServerPptx(deck, fileName);
    saveBlob(blob, fileName);
    return { fileName, source: "server" };
  } catch (error) {
    console.warn("python-pptx 服务不可用，改用本地导出", error);
  }
  await exportLocal(deck, fileName);
  return { fileName, source: "local" };
}

async function exportLocal(deck: PptDeck, fileName: string): Promise<void> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "乡课";
  pptx.company = "乡课 · 教师 AI 备课";
  pptx.title = deck.title;
  pptx.subject = deck.subtitle;

  const font = "微软雅黑";
  const total = deck.slides.length;

  deck.slides.forEach((data, index) => {
    const slide = pptx.addSlide();
    const dark = data.kind === "cover" || data.kind === "closing" || data.kind === "summary";
    slide.background = { color: dark ? COLORS.greenDeep : COLORS.paper };

    if (data.kind === "cover") {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 7.4,
        y: -1.2,
        w: 3.6,
        h: 3.6,
        fill: { color: COLORS.green, transparency: 20 },
        line: { color: COLORS.gold, width: 1 },
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 8.2,
        y: -0.4,
        w: 2.1,
        h: 2.1,
        fill: { color: COLORS.greenDeep, transparency: 10 },
        line: { color: COLORS.gold, width: 0.5, transparency: 45 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 0.14,
        h: 5.625,
        fill: { color: COLORS.gold },
        line: { color: COLORS.gold },
      });
      slide.addText("乡课", {
        x: 0.75,
        y: 0.45,
        w: 2,
        h: 0.4,
        fontFace: font,
        fontSize: 12,
        color: COLORS.gold,
        charSpacing: 3,
      });
      slide.addText(data.kicker ?? "", {
        x: 0.75,
        y: 1.35,
        w: 6.5,
        h: 0.35,
        fontFace: font,
        fontSize: 12,
        color: COLORS.gold,
        charSpacing: 1.5,
      });
      slide.addText(data.title, {
        x: 0.75,
        y: 1.75,
        w: 8.2,
        h: 1.1,
        fontFace: font,
        fontSize: 28,
        bold: true,
        color: "FBF8EE",
      });
      slide.addText(data.bullets.join("\n"), {
        x: 0.78,
        y: 3.0,
        w: 7.6,
        h: 1.2,
        fontFace: font,
        fontSize: 12,
        color: "D9E4D2",
        lineSpacingMultiple: 1.4,
      });
      slide.addText(data.note ?? "", {
        x: 0.78,
        y: 5.05,
        w: 7,
        h: 0.3,
        fontFace: font,
        fontSize: 9,
        color: "A8BBA9",
      });
      return;
    }

    if (data.kind === "closing") {
      slide.addShape(pptx.ShapeType.rect, {
        x: 4.5,
        y: 1.55,
        w: 1.0,
        h: 0.04,
        fill: { color: COLORS.gold },
        line: { color: COLORS.gold },
      });
      slide.addText(data.title, {
        x: 0.8,
        y: 1.9,
        w: 8.4,
        h: 0.8,
        fontFace: font,
        fontSize: 26,
        bold: true,
        color: "FBF8EE",
        align: "center",
      });
      slide.addText(data.bullets.join("\n"), {
        x: 1.2,
        y: 3.0,
        w: 7.6,
        h: 1.4,
        fontFace: font,
        fontSize: 12,
        color: "D9E4D2",
        align: "center",
        lineSpacingMultiple: 1.6,
      });
      return;
    }

    const isChalk = data.kind === "summary";
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 0.14,
      h: 5.625,
      fill: { color: isChalk ? COLORS.gold : COLORS.green },
      line: { color: isChalk ? COLORS.gold : COLORS.green },
    });
    slide.addText(data.kicker ?? "", {
      x: 0.75,
      y: 0.42,
      w: 1.4,
      h: 0.3,
      fontFace: font,
      fontSize: 10,
      bold: true,
      color: isChalk ? COLORS.gold : COLORS.red,
      charSpacing: 1.5,
    });
    slide.addText(data.title, {
      x: 0.75,
      y: 0.75,
      w: 8.5,
      h: 0.6,
      fontFace: font,
      fontSize: 21,
      bold: true,
      color: isChalk ? COLORS.chalk : COLORS.ink,
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.78,
      y: 1.4,
      w: 8.35,
      h: 0.015,
      fill: { color: isChalk ? "6F8574" : COLORS.gold, transparency: 20 },
      line: { color: isChalk ? "6F8574" : COLORS.gold, transparency: 20 },
    });

    const bulletItems = data.bullets.slice(0, 7).map((text) => ({
      text,
      options: {
        bullet: { characterCode: "2022", indent: 14 },
        breakLine: true,
      },
    }));
    slide.addText(bulletItems, {
      x: 0.82,
      y: 1.65,
      w: 8.2,
      h: 3.25,
      fontFace: font,
      fontSize: data.bullets.length > 5 ? 12 : 14,
      color: isChalk ? COLORS.chalk : COLORS.ink,
      lineSpacingMultiple: 1.3,
      valign: "top",
    });

    if (data.note) {
      slide.addText(data.note, {
        x: 0.82,
        y: 4.85,
        w: 8.2,
        h: 0.25,
        fontFace: font,
        fontSize: 9,
        color: isChalk ? "A8BBA9" : COLORS.muted,
      });
    }

    slide.addText(`乡课 · ${deck.title}`, {
      x: 0.6,
      y: 5.25,
      w: 6,
      h: 0.22,
      fontFace: font,
      fontSize: 8,
      color: isChalk ? "8FA292" : COLORS.muted,
    });
    slide.addText(`${index + 1} / ${total}`, {
      x: 8.9,
      y: 5.25,
      w: 0.8,
      h: 0.22,
      fontFace: font,
      fontSize: 8,
      color: isChalk ? "8FA292" : COLORS.muted,
      align: "right",
    });
  });

  await pptx.writeFile({ fileName });
}
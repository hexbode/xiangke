import type { PptVisualPlan, VisualPlanShape } from "./types";

export interface VisualPlanInput {
  hint: string;
  title: string;
  lesson: string;
  subject: string;
  grade: string;
  question?: string;
  conclusion?: string;
}

const CN_NUM: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

const COLOR_HEX: Record<string, string> = {
  红: "A6462E",
  绿: "2E5A3C",
  黄: "D9AE6A",
  蓝: "4C7FB0",
  橙: "C0703A",
  金: "D9AE6A",
};

const PALETTE = ["D9AE6A", "A6462E", "2E5A3C", "4C7FB0"];

const SUBJECT_EN: Record<string, string> = {
  语文: "Chinese",
  数学: "math",
  英语: "English",
  科学: "science",
  道德与法治: "moral education",
  音乐: "music",
  美术: "art",
  体育: "PE",
};

const WORD_EN: Record<string, string> = {
  月饼: "mooncakes",
  苹果: "apples",
  西瓜: "watermelon",
  橘子: "oranges",
  糖果: "candies",
  兔子: "rabbits",
  小鸟: "little birds",
  猴子: "monkeys",
  熊猫: "pandas",
  小动物: "small animals",
  小朋友: "children",
  种子: "seeds",
  叶子: "leaves",
  银杏: "ginkgo leaves",
  花: "flowers",
  秋天: "autumn",
  雨: "rain",
  数轴: "a number line",
  圆形: "circles",
  圆: "circles",
  正方形: "squares",
  长方形: "rectangles",
  三角形: "triangles",
  平均分: "equally divided",
  涂色: "colored",
  分数: "fractions",
  人民币: "banknotes",
  钟表: "a clock",
  植物: "plants",
  实验: "a science experiment",
};

function clean(text: string): string {
  return text
    .replace(/^\s*(配图|画面|插图|情境图|情境)[:：]\s*/, "")
    .replace(/[。；;]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(text: string, limit: number): string {
  const value = text.replace(/["\[\]{}]/g, "").trim();
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function toNumber(token: string): number {
  return CN_NUM[token] ?? (Number.parseInt(token, 10) || 1);
}

function buildMermaid(input: VisualPlanInput): PptVisualPlan {
  const text = clean(input.hint).replace(/^树状图[:：]\s*/, "");
  let labels: string[] = [];
  const chain = text.match(/[^→]+(?:→[^→]+)+/);
  if (chain) {
    labels = chain[0].split("→").map((item) => shorten(item, 14)).filter(Boolean);
  } else {
    const tail = text.split(/[：:]/).slice(1).join("：");
    if (tail) {
      labels = tail
        .split(/[、，,；;]/)
        .map((item) => shorten(item.replace(/^(画|出示|用)/, ""), 14))
        .filter(Boolean);
    }
  }
  labels = labels.slice(0, 4);
  const root = shorten(input.title.split(/[：:]/)[0] || input.lesson || input.title, 16);
  const nodes: { id: string; label: string }[] = [];
  const edges: { from: string; to: string }[] = [];
  if (labels.length >= 2) {
    labels.forEach((label, index) => nodes.push({ id: `N${index}`, label }));
    for (let index = 1; index < labels.length; index += 1) {
      edges.push({ from: `N${index - 1}`, to: `N${index}` });
    }
  } else {
    const branches = labels.length === 1 ? labels : ["含义", "方法", "应用"];
    nodes.push({ id: "N0", label: root });
    branches.forEach((label, index) => {
      nodes.push({ id: `N${index + 1}`, label });
      edges.push({ from: "N0", to: `N${index + 1}` });
    });
  }
  const lines = ["graph TD"];
  for (const node of nodes) {
    lines.push(`  ${node.id}["${node.label}"]`);
  }
  for (const edge of edges) {
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }
  return {
    type: "mermaid",
    summary: "树状图 / 逻辑关系：生成可直接渲染的 Mermaid 代码",
    mermaid: lines.join("\n"),
    mermaidNodes: nodes,
    mermaidEdges: edges,
  };
}

function buildShapes(text: string): VisualPlanShape[] {
  const regex =
    /(\d+|[一二两三四五六七八九十])\s*(?:个|张|组|块|粒)?[^。；;，,]{0,10}?(半圆|圆形|圆片|圆点|圆|正方形|方块|长方形|三角形)/g;
  const palette = [...text.matchAll(/红|绿|黄|蓝|橙|金/g)].map((match) => COLOR_HEX[match[0]]);
  const found: Omit<VisualPlanShape, "rows" | "cols">[] = [];
  let total = 0;
  for (const match of text.matchAll(regex)) {
    if (total >= 6) break;
    const count = Math.min(6 - total, Math.max(1, toNumber(match[1])));
    const shapeWord = match[2];
    const type: VisualPlanShape["type"] = shapeWord.includes("三角")
      ? "triangle"
      : shapeWord.includes("圆")
        ? "circle"
        : "square";
    const segmentColor = match[0].match(/红|绿|黄|蓝|橙|金/)?.[0];
    const color = segmentColor
      ? COLOR_HEX[segmentColor]
      : palette[found.length] ?? PALETTE[found.length % PALETTE.length];
    found.push({ type, count, color, label: shapeWord });
    total += count;
  }
  if (found.length === 0) {
    const single = text.match(/正方形|长方形|三角形|圆形|圆片|圆/);
    if (single) {
      const type: VisualPlanShape["type"] = single[0].includes("三角")
        ? "triangle"
        : single[0].includes("圆")
          ? "circle"
          : "square";
      found.push({ type, count: 1, color: palette[0] ?? PALETTE[0], label: single[0] });
      total = 1;
    } else {
      found.push({ type: "circle", count: 3, color: PALETTE[0], label: "圆形" });
      total = 3;
    }
  }
  const cols = total <= 3 ? total : total <= 4 ? 2 : 3;
  const rows = Math.ceil(total / cols);
  return found.map((item) => ({ ...item, rows, cols }));
}

function buildPython(input: VisualPlanInput): PptVisualPlan {
  const text = clean(input.hint);
  const shapes = buildShapes(text);
  const total = Math.min(6, shapes.reduce((sum, item) => sum + item.count, 0));
  const cols = total <= 3 ? total : total <= 4 ? 2 : 3;
  const rows = Math.ceil(total / cols);
  shapes.forEach((item) => {
    item.rows = rows;
    item.cols = cols;
  });
  const fractions = [...text.matchAll(/\d+\/\d+/g)].map((match) => match[0]);
  const specs: string[] = [];
  let index = 0;
  for (const item of shapes) {
    for (let count = 0; count < item.count; count += 1) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const left = 1.2 + col * (7.6 / cols);
      const top = 1.4 + row * (2.6 / rows);
      const size = Math.min(1.35, (7.2 / cols) * 0.72, (2.4 / rows) * 0.8);
      const shapeName =
        item.type === "circle"
          ? "MSO_SHAPE.OVAL"
          : item.type === "triangle"
            ? "MSO_SHAPE.ISOSCELES_TRIANGLE"
            : "MSO_SHAPE.ROUNDED_RECTANGLE";
      const label = fractions[index] ?? "";
      specs.push(
        `    (${shapeName}, ${left.toFixed(2)}, ${top.toFixed(2)}, ${size.toFixed(2)}, ${size.toFixed(2)}, "${item.color}", "${label}"),`,
      );
      index += 1;
    }
  }
  const safeTitle = (input.title || input.lesson || "配图").replace(/[\\/:*?"<>|]/g, "-");
  const python = [
    `"""乡课配图：${input.title}（python-pptx，可直接运行）"""`,
    "from pptx import Presentation",
    "from pptx.dml.color import RGBColor",
    "from pptx.enum.shapes import MSO_SHAPE",
    "from pptx.util import Inches, Pt",
    "",
    "prs = Presentation()",
    "slide = prs.slides.add_slide(prs.slide_layouts[6])",
    "",
    "",
    "def add_shape(shape_type, x, y, w, h, color, label=\"\"):",
    "    shape = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))",
    "    shape.fill.solid()",
    "    shape.fill.fore_color.rgb = RGBColor.from_string(color)",
    "    shape.line.color.rgb = RGBColor.from_string(\"2E5A3C\")",
    "    shape.line.width = Pt(1.25)",
    "    if label:",
    "        shape.text_frame.text = label",
    "        for paragraph in shape.text_frame.paragraphs:",
    "            for run in paragraph.runs:",
    "                run.font.size = Pt(14)",
    "                run.font.color.rgb = RGBColor.from_string(\"22301F\")",
    "",
    "",
    "specs = [",
    ...specs,
    "]",
    "for spec in specs:",
    "    add_shape(*spec)",
    "",
    `prs.save("配图-${safeTitle}.pptx")`,
  ].join("\n");
  return {
    type: "python-pptx",
    summary: "几何图形 / 数量对应：生成可直接运行的 python-pptx 代码",
    python,
    params: { shapes, rows, cols, note: `${rows} 行 × ${cols} 列，绿色描边，圆角/圆形按图形填充` },
  };
}

function translate(text: string): string {
  const found: string[] = [];
  const skip = new Set(["平均分", "涂色", "分数"]);
  for (const [zh, en] of Object.entries(WORD_EN)) {
    if (!skip.has(zh) && text.includes(zh) && !found.includes(en)) {
      found.push(en);
    }
  }
  const actions: string[] = [];
  if (/平均分|同样多|一样多/.test(text)) {
    actions.push("being equally divided into shares");
  }
  if (/涂色|涂上/.test(text)) {
    actions.push("part of the shapes colored");
  }
  if (/分成/.test(text) && actions.length === 0) {
    actions.push("divided into parts");
  }
  if (found.length > 0) {
    return `a scene with ${found.slice(0, 6).join(", ")}${
      actions.length > 0 ? `, ${actions[0]}` : ""
    }`;
  }
  if (actions.length > 0) {
    return `a simple classroom scene showing ${actions[0]}`;
  }
  return "a warm rural classroom scene with simple teaching props and friendly characters";
}

function buildAiPrompt(input: VisualPlanInput): PptVisualPlan {
  const text = clean(input.hint);
  const subjectEn = SUBJECT_EN[input.subject] ?? "primary school";
  const promptZh = `儿童绘本水彩风课件插图：${text}。小学${input.grade}${input.subject}课堂使用，浅米色干净背景，主体居中，柔和自然光，画面无文字、无边框。`;
  const promptEn = `Children's picture-book watercolor illustration for a primary school ${subjectEn} lesson: ${translate(
    text,
  )}. Clean cream background, centered subject, soft natural light, no text, no border, 16:9.`;
  return {
    type: "ai-prompt",
    summary: "情境插图：生成中英文 AI 绘画提示词",
    promptZh,
    promptEn,
  };
}

function buildParams(input: VisualPlanInput): PptVisualPlan {
  const text = clean(input.hint);
  const rowMatch = text.match(/([一二两三四])行/);
  const colMatch = text.match(/([一二两三四])列/);
  const rows = rowMatch ? toNumber(rowMatch[1]) : 1;
  const cols = colMatch ? toNumber(colMatch[1]) : 3;
  const shapeType: VisualPlanShape["type"] = /圆/.test(text) ? "circle" : "square";
  const color = /红/.test(text) ? COLOR_HEX["红"] : "FBF8EE";
  const shapes: VisualPlanShape[] = [
    { type: shapeType, count: rows * cols, color, rows, cols, label: shapeType === "circle" ? "圆形" : "卡片" },
  ];
  const note = `形状：${shapeType === "circle" ? "圆形" : "圆角矩形"}；填充：${color === "FBF8EE" ? "米白 #FBF8EE" : "红色 #A6462E"}；描边：金 #D9AE6A，1.25pt；区域：5.9×1.9 英寸；${rows} 行 × ${cols} 列；间距 0.25 英寸；字号 11pt。`;
  return {
    type: "ppt-params",
    summary: "简单排版：输出可照做的 PPT 操作参数",
    params: { shapes, rows, cols, note },
  };
}

export function buildVisualPlan(input: VisualPlanInput): PptVisualPlan {
  const hint = clean(input.hint);
  if (/树状图|思维导图|关系图|逻辑|分类|结构图|流程图|层级/.test(hint)) {
    return buildMermaid(input);
  }
  if (
    /兔子|小鸟|猴子|熊猫|小动物|动物|月饼|苹果|西瓜|橘子|糖果|食物|小朋友|孩子|种子|叶子|花|雨|秋天|情境/.test(
      hint,
    )
  ) {
    return buildAiPrompt(input);
  }
  if (/圆|正方形|长方形|三角形|圆点|方块|格子|涂色|平均分|几份|数轴|数量/.test(hint)) {
    return buildPython(input);
  }
  return buildParams(input);
}

export const VISUAL_PLAN_LABELS: Record<PptVisualPlan["type"], string> = {
  mermaid: "Mermaid 树状图",
  "python-pptx": "python-pptx 图形",
  "ai-prompt": "AI 绘画提示词",
  "ppt-params": "PPT 排版参数",
};

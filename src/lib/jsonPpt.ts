import type PptxGenJS from "pptxgenjs";
import type { JsonCourse, JsonCourseSlide, JsonGraphData } from "./courseJson";

type PptxSlide = ReturnType<PptxGenJS["addSlide"]>;

const COLORS = {
  ink: "22301F",
  muted: "6B7468",
  red: "D94A3A",
  green: "3E8E5A",
  blue: "2C5F9E",
  line: "E2D8C2",
};

function addNotes(slide: PptxSlide, note?: string) {
  if (!note) return;
  slide.addNotes(note);
}

function addCover(pptx: PptxGenJS, course: JsonCourse, slide: JsonCourseSlide) {
  const page = pptx.addSlide();
  page.background = { color: "FFFFFF" };
  page.addText(slide.title, {
    x: 0.7,
    y: 1.55,
    w: 8.6,
    h: 0.9,
    fontFace: "微软雅黑",
    fontSize: 34,
    bold: true,
    color: COLORS.ink,
  });
  if (slide.subtitle) {
    page.addText(slide.subtitle, {
      x: 0.7,
      y: 2.55,
      w: 8.6,
      h: 0.5,
      fontFace: "微软雅黑",
      fontSize: 17,
      color: COLORS.muted,
    });
  }
  page.addText(`${course.grade} · ${course.courseName}`, {
    x: 0.7,
    y: 4.75,
    w: 6,
    h: 0.3,
    fontFace: "微软雅黑",
    fontSize: 11,
    color: COLORS.muted,
  });
  addNotes(page, slide.note);
}

function addTree(pptx: PptxGenJS, page: PptxSlide, nodes: JsonGraphData["nodes"]) {
  if (!nodes || nodes.length === 0) return;
  const items = nodes.slice(0, 8);
  const byId = new Map(items.map((node) => [node.id, node]));
  const depthOf = (id: string, guard = 0): number => {
    const node = byId.get(id);
    if (!node?.parent || guard > 6) return 0;
    return depthOf(node.parent, guard + 1) + 1;
  };
  const groups = new Map<number, typeof items>();
  items.forEach((node) => {
    const depth = depthOf(node.id);
    groups.set(depth, [...(groups.get(depth) ?? []), node]);
  });
  const maxDepth = Math.max(1, ...groups.keys());
  const positions = new Map<string, { x: number; y: number }>();
  groups.forEach((group, depth) => {
    group.forEach((node, index) => {
      positions.set(node.id, {
        x: 0.8 + ((index + 0.5) * 8.2) / group.length,
        y: 2.35 + (depth * 1.45) / maxDepth,
      });
    });
  });
  const boxW = 1.15;
  const boxH = 0.34;
  items.forEach((node) => {
    const point = positions.get(node.id);
    const parent = node.parent ? positions.get(node.parent) : null;
    if (!point) return;
    if (parent) {
      const startX = parent.x;
      const startY = parent.y + boxH / 2;
      const endX = point.x;
      const endY = point.y - boxH / 2;
      page.addShape(pptx.ShapeType.line, {
        x: Math.min(startX, endX),
        y: startY,
        w: Math.abs(endX - startX),
        h: endY - startY,
        line: { color: "2E5A3C", width: 1 },
      });
    }
    page.addShape(pptx.ShapeType.roundRect, {
      x: point.x - boxW / 2,
      y: point.y - boxH / 2,
      w: boxW,
      h: boxH,
      fill: { color: "FBF8EE" },
      line: { color: "2E5A3C", width: 1 },
    });
    page.addText(node.label, {
      x: point.x - boxW / 2,
      y: point.y - boxH / 2 + 0.04,
      w: boxW,
      h: boxH - 0.08,
      fontFace: "微软雅黑",
      fontSize: 8,
      color: COLORS.ink,
      align: "center",
      valign: "middle",
    });
  });
}

function addGraphic(pptx: PptxGenJS, slide: JsonCourseSlide) {
  const page = pptx.addSlide();
  page.background = { color: "FFFFFF" };
  page.addText(slide.title, {
    x: 0.6,
    y: 0.38,
    w: 8.8,
    h: 0.55,
    fontFace: "微软雅黑",
    fontSize: 24,
    bold: true,
    color: COLORS.ink,
  });
  if (slide.content && slide.content.length > 0) {
    page.addText(
      slide.content.map((text) => ({
        text,
        options: { breakLine: true },
      })),
      {
        x: 0.65,
        y: 1.08,
        w: 8.8,
        h: 1,
        fontFace: "微软雅黑",
        fontSize: 15,
        color: COLORS.ink,
        lineSpacingMultiple: 1.3,
      },
    );
  }
  if (slide.graphData?.type === "dot_matrix") {
    const red = Math.min(24, Math.max(0, slide.graphData.red ?? 0));
    const green = Math.min(24, Math.max(0, slide.graphData.green ?? 0));
    const total = red + green;
    const perRow = 7;
    const size = 0.34;
    const gap = 0.14;
    const startX = 0.75;
    const startY = 2.35;
    for (let index = 0; index < total; index += 1) {
      const col = index % perRow;
      const row = Math.floor(index / perRow);
      page.addShape(pptx.ShapeType.ellipse, {
        x: startX + col * (size + gap),
        y: startY + row * (size + gap),
        w: size,
        h: size,
        fill: { color: index < red ? COLORS.red : COLORS.green },
        line: { color: index < red ? COLORS.red : COLORS.green },
      });
    }
  }
  if (slide.graphData?.type === "tree") {
    addTree(pptx, page, slide.graphData.nodes);
  }
  if (slide.formulas && slide.formulas.length > 0) {
    const half = Math.ceil(slide.formulas.length / 2);
    const columns = [slide.formulas.slice(0, half), slide.formulas.slice(half)];
    columns.forEach((items, columnIndex) => {
      if (items.length === 0) return;
      page.addText(
        items.map((text) => ({
          text,
          options: { breakLine: true, bullet: false },
        })),
        {
          x: 0.7 + columnIndex * 4.5,
          y: 4.25,
          w: 4.2,
          h: 1,
          fontFace: "Cambria Math",
          fontSize: 19,
          bold: true,
          color: COLORS.blue,
          lineSpacingMultiple: 1.2,
        },
      );
    });
  }
  addNotes(page, slide.note);
}

function addSummary(pptx: PptxGenJS, slide: JsonCourseSlide) {
  const page = pptx.addSlide();
  page.background = { color: "FFFFFF" };
  page.addText(slide.title, {
    x: 0.7,
    y: 1.35,
    w: 8.6,
    h: 0.7,
    fontFace: "微软雅黑",
    fontSize: 30,
    bold: true,
    color: COLORS.ink,
  });
  if (slide.content && slide.content.length > 0) {
    page.addText(
      slide.content.map((text) => ({
        text,
        options: { breakLine: true },
      })),
      {
        x: 0.72,
        y: 2.25,
        w: 8.5,
        h: 1.6,
        fontFace: "微软雅黑",
        fontSize: 18,
        color: COLORS.ink,
        lineSpacingMultiple: 1.5,
      },
    );
  }
  addNotes(page, slide.note);
}

export async function exportJsonPpt(course: JsonCourse): Promise<string> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "乡课";
  pptx.company = "乡课 · 教师 AI 备课";
  pptx.title = course.courseName;
  pptx.subject = `${course.grade} · ${course.courseName}`;
  for (const slide of course.slides) {
    if (slide.type === "cover") addCover(pptx, course, slide);
    else if (slide.type === "summary") addSummary(pptx, slide);
    else addGraphic(pptx, slide);
  }
  const fileName = `${course.courseName}_乡课课件.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
}


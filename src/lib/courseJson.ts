export type JsonSlideType = "cover" | "graphic" | "summary";

export interface JsonGraphNode {
  id: string;
  label: string;
  parent?: string;
}

export interface JsonGraphData {
  type: "dot_matrix" | "tree";
  red?: number;
  green?: number;
  nodes?: JsonGraphNode[];
}

export interface JsonCourseSlide {
  id: number;
  type: JsonSlideType;
  title: string;
  subtitle?: string;
  content?: string[];
  graphData?: JsonGraphData;
  formulas?: string[];
  note?: string;
}

export interface JsonCourse {
  courseName: string;
  grade: string;
  slides: JsonCourseSlide[];
  generatedAt?: string;
  source?: "local-template" | "ai";
}

/** 未来接入大模型时使用：强制模型按此结构输出 JSON。 */
export const COURSE_JSON_CONTRACT = `{
  "courseName": "10的加减法",
  "grade": "一年级",
  "slides": [
    {
      "id": 1,
      "type": "cover",
      "title": "10的加减法",
      "subtitle": "记住5对好朋友，一张图写出4个算式",
      "note": "教师备注：检查学生学具准备"
    },
    {
      "id": 2,
      "type": "graphic",
      "title": "第一关：凑十·10的朋友",
      "content": ["1和9合起来是10", "2和8合起来是10"],
      "graphData": { "type": "dot_matrix", "red": 9, "green": 1 },
      "formulas": ["9 + 1 = 10", "10 - 1 = 9"],
      "note": "教师备注：提问学生，红苹果有几个？绿苹果有几个？"
    }
  ]
}`;

function tenCourse(grade: string, topic: string): JsonCourse {
  return {
    courseName: topic,
    grade,
    source: "local-template",
    slides: [
      {
        id: 1,
        type: "cover",
        title: topic,
        subtitle: "记住 5 对好朋友，一张图写出 4 个算式",
        note: "教师备注：检查学生学具准备，每个小组 10 个圆片。",
      },
      {
        id: 2,
        type: "graphic",
        title: "第一关：凑十 · 10 的朋友",
        content: ["1 和 9 合起来是 10", "2 和 8 合起来是 10"],
        graphData: { type: "dot_matrix", red: 9, green: 1 },
        formulas: ["9 + 1 = 10", "10 - 1 = 9"],
        note: "教师备注：问学生红苹果有几个、绿苹果有几个，再一起数一数。",
      },
      {
        id: 3,
        type: "graphic",
        title: "第二关：看图写出 4 个算式",
        content: ["左边 6 个，右边 4 个，合起来是 10", "从 10 里去掉一部分，还剩另一部分"],
        graphData: { type: "dot_matrix", red: 6, green: 4 },
        formulas: ["6 + 4 = 10", "4 + 6 = 10", "10 - 6 = 4", "10 - 4 = 6"],
        note: "教师备注：先让学生说图意，再写算式，最后同桌互查。",
      },
      {
        id: 4,
        type: "graphic",
        title: "第三关：5 对好朋友",
        content: ["1—9、2—8、3—7", "4—6、5—5"],
        graphData: { type: "dot_matrix", red: 5, green: 5 },
        formulas: ["5 + 5 = 10", "10 - 5 = 5"],
        note: "教师备注：拍手对答，教师说前半句，学生接后半句。",
      },
      {
        id: 5,
        type: "summary",
        title: "一句话记住",
        content: ["看到 10，先想 5 对好朋友", "一幅图，两加两减共 4 个算式"],
        note: "教师备注：请两名学生用自己的话说一说，再齐读口诀。",
      },
    ],
  };
}

function genericCourse(grade: string, topic: string): JsonCourse {
  return {
    courseName: topic,
    grade,
    source: "local-template",
    slides: [
      {
        id: 1,
        type: "cover",
        title: topic,
        subtitle: "屏幕极简：字大、图大、废话少",
        note: "教师备注：课前检查学具与分组。",
      },
      {
        id: 2,
        type: "graphic",
        title: "第一步：看清条件",
        content: [`今天学习《${topic}》`, "先找出已知条件和要解决的问题"],
        graphData: { type: "dot_matrix", red: 5, green: 4 },
        formulas: ["5 + 4 = 9", "9 - 5 = 4"],
        note: "教师备注：请学生用手指一指图中的条件。",
      },
      {
        id: 3,
        type: "graphic",
        title: "第二步：动手验证",
        content: ["用圆片摆一摆", "把想法说给同桌听"],
        graphData: { type: "dot_matrix", red: 3, green: 3 },
        formulas: ["3 + 3 = 6", "6 - 3 = 3"],
        note: "教师备注：巡视两组，纠正摆法与说法。",
      },
      {
        id: 4,
        type: "summary",
        title: "一句话记住",
        content: ["先看清条件，再动手验证", "最后把理由说清楚"],
        note: "教师备注：指名复述本课方法。",
      },
    ],
  };
}

export function buildLocalCourseJson(grade: string, topic: string): JsonCourse {
  const name = topic.trim() || "10的加减法";
  const isTen = /10/.test(name) && /加|减/.test(name);
  const course = isTen ? tenCourse(grade, name) : genericCourse(grade, name);
  return {
    ...course,
    generatedAt: new Date().toISOString(),
  };
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringList(value: unknown, limit = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, limit);
}

/** 容错解析：大模型偶尔返回奇怪结构时，保证页面不崩。 */
export function normalizeCourseJson(raw: unknown): JsonCourse {
  if (!raw || typeof raw !== "object") {
    throw new Error("课件 JSON 必须是对象");
  }
  const data = raw as Record<string, unknown>;
  const rawSlides = Array.isArray(data.slides) ? data.slides : [];
  const slides: JsonCourseSlide[] = rawSlides.slice(0, 30).map((item, index) => {
    const slide = (item ?? {}) as Record<string, unknown>;
    const graph = slide.graphData as Record<string, unknown> | undefined;
    const graphType = graph?.type === "tree" ? "tree" : graph?.type === "dot_matrix" ? "dot_matrix" : undefined;
    return {
      id: Number(slide.id) || index + 1,
      type:
        slide.type === "cover" || slide.type === "summary" || slide.type === "graphic"
          ? slide.type
          : "graphic",
      title: asString(slide.title, `第 ${index + 1} 页`),
      subtitle: asString(slide.subtitle) || undefined,
      content: asStringList(slide.content),
      graphData: graphType
        ? {
            type: graphType,
            red: Math.max(0, Math.min(24, Number(graph?.red) || 0)),
            green: Math.max(0, Math.min(24, Number(graph?.green) || 0)),
            nodes: Array.isArray(graph?.nodes)
              ? (graph.nodes as unknown[]).slice(0, 12).map((node, nodeIndex) => {
                  const entry = (node ?? {}) as Record<string, unknown>;
                  return {
                    id:
                      typeof entry.id === "number"
                        ? String(entry.id)
                        : asString(entry.id, `n${nodeIndex}`),
                    label: asString(entry.label, `节点 ${nodeIndex + 1}`),
                    parent:
                      typeof entry.parent === "number"
                        ? String(entry.parent)
                        : asString(entry.parent) || undefined,
                  };
                })
              : undefined,
          }
        : undefined,
      formulas: asStringList(slide.formulas, 6),
      note: asString(slide.note) || undefined,
    };
  });
  if (slides.length === 0) {
    throw new Error("课件 JSON 至少需要 1 页");
  }
  return {
    courseName: asString(data.courseName, "未命名课件"),
    grade: asString(data.grade, ""),
    slides,
    generatedAt: asString(data.generatedAt) || undefined,
    source: data.source === "ai" ? "ai" : "local-template",
  };
}

import { buildTopicSections } from "./pptTopics";
import type { TopicSections } from "./pptTopics";
import { buildVisualPlan } from "./visualPlan";
import type {
  LessonMeta,
  LessonType,
  PptBrief,
  PptCheck,
  PptCourseType,
  PptDeck,
  PptSlide,
  Quiz,
} from "./types";

export const PPT_PAGE_OPTIONS = [5, 10, 15, 20, 25] as const;
export const MIN_PPT_PAGES = 3;
export const MAX_PPT_PAGES = 999;
export const DEFAULT_PPT_PAGES = 10;

export const VOLUME_OPTIONS = ["上册", "下册"] as const;
export const PPT_LEVEL_OPTIONS = ["基础一般", "待补基础", "学有余力"] as const;
export const PPT_AID_OPTIONS = ["纸", "剪刀", "彩笔", "小黑板", "小棒"] as const;

export const COURSE_TYPE_LABEL: Record<PptCourseType, string> = {
  new: "新授课",
  practice: "练习课",
  review: "复习课",
};

const DECOR = /STEP|SCENE|引擎生成|CASE PATH/i;

function shorten(text: string, limit = 42): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function trimTail(text: string): string {
  return text.replace(/[。；;，,.\s]+$/g, "");
}

function normalizePageCount(value?: number): number {
  if (!value || !Number.isFinite(value)) return DEFAULT_PPT_PAGES;
  return Math.min(MAX_PPT_PAGES, Math.max(MIN_PPT_PAGES, Math.round(value)));
}

function visualFor(subject: string, topic: string): string {
  if (subject === "数学") {
    return `配图：左侧画 6 个绿色圆点，右侧画 4 个红色圆点，中间画加号；下方写与「${topic}」对应的算式与结果。`;
  }
  if (subject === "语文") {
    return `配图：左侧画 3 个绿色方块写关键词，右侧画 2 个红色三角形标重点，中间用箭头连接。`;
  }
  if (subject === "科学") {
    return `配图：画 2 个圆形容器（一绿一红），中间用箭头连接，右侧画 3 行记录表。`;
  }
  if (subject === "英语") {
    return `配图：左侧 4 张绿色方形单词卡，右侧 4 张红色圆形图卡，中间画一个对话气泡。`;
  }
  return `配图：画 3 个并排的方形情境卡，分别用绿色对勾与红色叉号标注。`;
}

function activityFor(subject: string): string {
  if (subject === "数学") return "动手折一折、画一画，把这一点表示出来。";
  if (subject === "语文") return "圈出关键词句，和同桌说一说。";
  if (subject === "科学") return "观察现象，记录证据，和小组交流。";
  if (subject === "英语") return "看图跟读，和同桌用目标句型问答。";
  return "读情境，和同桌说清该怎么做。";
}

interface FlowStep {
  label: string;
  game?: string;
  minutes: number;
  tier?: number;
  title: string;
  activity: string;
  question: string;
  conclusion: string;
  teacherNote: string;
  visualHint: string;
  mnemonic?: string;
}

interface FlowPlan {
  boundary: string[];
  steps: FlowStep[];
}

// 按课时时长等比缩放环节时间，保证加总严格等于课时
function scaleSteps(steps: FlowStep[], target: number): FlowStep[] {
  const total = steps.reduce((sum, step) => sum + step.minutes, 0);
  if (total === target || total === 0) return steps.map((step) => ({ ...step }));
  const raw = steps.map((step) => (step.minutes / total) * target);
  const minutes = raw.map((value) => Math.floor(value));
  let rest = target - minutes.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  let cursor = 0;
  while (rest > 0) {
    minutes[order[cursor % order.length].index] += 1;
    rest -= 1;
    cursor += 1;
  }
  return steps.map((step, index) => ({ ...step, minutes: Math.max(1, minutes[index]) }));
}

// 游戏化关卡、口诀与强配图指令（分数两课时）
const FRACTION_ENRICH: Record<
  string,
  { game: string; tier: number; mnemonic: string; visualHint: string }
> = {
  "分月饼：两块一样大吗": {
    game: "第 1 关 · 分月饼",
    tier: 1,
    mnemonic: "平均分，先分匀；不平均，不算数。",
    visualHint:
      "配图：左侧画 1 个完整金色圆；右侧上方画 2 个大小不等的红色半圆并打叉，下方画 2 个一样大的绿色半圆并打勾。",
  },
  "折纸找 1/2": {
    game: "第 2 关 · 折出 1/2",
    tier: 1,
    mnemonic: "先分后取：分母看份数，分子看取几。",
    visualHint:
      "配图：三张同样大的白色长方形横排：第 1 张完整；第 2 张中间画竖虚线；第 3 张左半涂绿色、右半留白，旁边写 1/2。",
  },
  "再折一次：找 1/4": {
    game: "第 3 关 · 再折 1/4",
    tier: 2,
    mnemonic: "平均分成 4 份，每份是 1/4。",
    visualHint: "配图：正方形四等分，左上 1 格涂绿色，其余 3 格留白；下方写 1/4。",
  },
  "不平均分，能用 1/2 吗": {
    game: "第 4 关 · 火眼金睛",
    tier: 3,
    mnemonic: "每份一样大，才能用分数。",
    visualHint:
      "配图：三个同样大的圆并排：图 1 分 2 份但大小不等（红叉）；图 2 平均分 2 份涂 1 份（绿勾）；图 3 分 3 份涂 1 份（红叉）。",
  },
  "课堂练习：看图写分数": {
    game: "第 5 关 · 闯关练习",
    tier: 1,
    mnemonic: "先看平均分，再看取几份。",
    visualHint:
      "配图：三组图形并排：①长方形 4 格涂 1 格；②圆 2 等分涂 1 份；③圆分 3 份且大小不等（打叉）。",
  },
  "一句话说清今天学了什么": {
    game: "第 6 关 · 收星星",
    tier: 1,
    mnemonic: "平均分是前提，1/2、1/4 表示其中一份。",
    visualHint:
      "配图：板书三行：平均分 → 1/2 → 1/4；每行左侧画对应图形（纸、对折线、涂色）。",
  },
  "复习 1/2 和 1/4": {
    game: "第 1 关 · 复习热身",
    tier: 1,
    mnemonic: "先分后取，分母看份数。",
    visualHint:
      "配图：两张同样大的长方形并排：左图 2 等分涂 1 份标 1/2；右图 4 等分涂 1 份标 1/4。",
  },
  "涂 3 份：认识 3/4": {
    game: "第 2 关 · 涂出 3/4",
    tier: 1,
    mnemonic: "分母总份数，分子涂几份。",
    visualHint: "配图：正方形四等分，3 格涂橙色、1 格留白，右侧写 3/4。",
  },
  "同分母比大小：3/5 与 2/5": {
    game: "第 3 关 · 比大小",
    tier: 1,
    mnemonic: "同分母，比分子，分子大的分数大。",
    visualHint:
      "配图：两条同样长的长方形：上条 5 等分涂 3 格绿色标 3/5；下条 5 等分涂 2 格红色标 2/5。",
  },
  "分母不同，能直接比分子吗": {
    game: "第 4 关 · 火眼金睛",
    tier: 3,
    mnemonic: "分母不同，不能直接比分子。",
    visualHint:
      "配图：两个大小不同的圆：左边 3 等分涂 1 份标 1/3；右边 5 等分涂 1 份标 1/5；中间画红叉。",
  },
  "课堂练习：涂一涂、比一比": {
    game: "第 5 关 · 闯关练习",
    tier: 1,
    mnemonic: "先看分母，再比分子。",
    visualHint:
      "配图：三组同分母长方形涂色图：①4 等分涂 3；②7 等分涂 4 与 2；③8 等分涂 5 与 3。",
  },
  "一句话说清本课结论": {
    game: "第 6 关 · 收星星",
    tier: 1,
    mnemonic: "同分母 → 比分子 → 分子大的大。",
    visualHint:
      "配图：板书一行：同分母 → 比分子 → 分子大的分数大；下方画两条 5 等分涂色条。",
  },
};

function fractionFlow(period: number): FlowPlan | null {
  if (period === 1) {
    return {
      boundary: [
        "本课时只教：平均分、几分之一、1/2 和 1/4、读法与写法。",
        "本课时不教：几分之几、同分母比较、分数加减。",
        "可观察目标：能折出并涂出 1/2、1/4；能读出、写出这两个分数；能判断是否平均分。",
      ],
      steps: [
        {
          label: "情景导入",
          minutes: 3,
          title: "分月饼：两块一样大吗",
          activity: "用手比一比，判断两块月饼是不是一样大。",
          question: "怎样分，每块才一样大？",
          conclusion: "只有平均分，才可以用分数表示其中的一份。",
          teacherNote: "答案：平均分成 2 块；易错：随手掰一半；时间 3 分钟。",
          visualHint: "配图：两块大小不等的月饼打叉，平均分的两块打勾。",
        },
        {
          label: "探究一",
          minutes: 12,
          title: "折纸找 1/2",
          activity: "把纸对折、涂其中一份，并在涂色部分写 1/2。",
          question: "对折后，每份是这张纸的几分之几？",
          conclusion: "把一张纸平均分成 2 份，每份是它的 1/2。",
          teacherNote: "答案：1/2 读作二分之一；易错：分母写成涂色份数；时间 12 分钟。",
          visualHint: "配图：对折三步图 + 1/2 涂色示意图。",
        },
        {
          label: "探究二",
          minutes: 8,
          title: "再折一次：找 1/4",
          activity: "再对折一次，涂其中 1 份，写出 1/4。",
          question: "现在每份是原来这张纸的几分之几？",
          conclusion: "平均分成 4 份，每份是它的 1/4。",
          teacherNote: "答案：1/4；易错：涂了 2 份却写 1/4；时间 8 分钟。",
          visualHint: "配图：四等分圆和长方形涂色图。",
        },
        {
          label: "反例辨析",
          minutes: 5,
          title: "不平均分，能用 1/2 吗",
          activity: "判断三幅图能否用 1/2 表示，并说出理由。",
          question: "不平均分，能用 1/2 表示其中一份吗？",
          conclusion: "不能；每份必须同样大，才能用分数表示。",
          teacherNote: "答案：只有第 2 幅可以；互评：说清「平均分」；时间 5 分钟。",
          visualHint: "配图：三幅对比图，其中两幅大小不等。",
        },
        {
          label: "课堂练习",
          minutes: 10,
          title: "课堂练习：看图写分数",
          activity: "独立完成 3 题，同桌互评并说出依据。",
          question: "你是先看什么，再看什么？",
          conclusion: "先看是否平均分，再看取了几份。",
          teacherNote:
            "答案：1) 1/4 2) 1/2 3) 第 2 幅；互评标准：平均分 + 取几份；时间 10 分钟。",
          visualHint: "配图：分数图形题卡（圆形、长方形）。",
        },
        {
          label: "课堂小结",
          minutes: 2,
          title: "一句话说清今天学了什么",
          activity: "用一句话说给同桌听，并举一个 1/2 的例子。",
          question: "今天的分数都建立在什么前提上？",
          conclusion: "平均分是分数的前提；1/2、1/4 都表示其中一份。",
          teacherNote: "答案：平均分；作业：折出 1/2、1/4 并涂色；时间 2 分钟。",
          visualHint: "配图：板书结构图（平均分 → 1/2 → 1/4）。",
        },
      ],
    };
  }
  if (period === 2) {
    return {
      boundary: [
        "本课时只教：几分之几、同分母分数比较。",
        "本课时不教：异分母比较、分数加减。",
        "可观察目标：能涂出 3/4 并说明；能比较同分母分数大小；能说出比较依据。",
      ],
      steps: [
        {
          label: "情景导入",
          minutes: 3,
          title: "复习 1/2 和 1/4",
          activity: "拿出上节课折的纸，指一指 1/2 和 1/4。",
          question: "1/4 表示什么？",
          conclusion: "把纸平均分成 4 份，取其中 1 份是 1/4。",
          teacherNote: "答案：平均分 + 取 1 份；易错：忘记平均分；时间 3 分钟。",
          visualHint: "配图：1/2 与 1/4 的对比图。",
        },
        {
          label: "探究一",
          minutes: 12,
          title: "涂 3 份：认识 3/4",
          activity: "在同一张四等分纸上涂 3 份，写出 3/4。",
          question: "涂了 3 份，分母和分子各是几？",
          conclusion: "平均分成 4 份，取 3 份是 3/4。",
          teacherNote: "答案：3/4；易错：分母写成 3；时间 12 分钟。",
          visualHint: "配图：四等分纸涂 3 份的示意图。",
        },
        {
          label: "探究二",
          minutes: 10,
          title: "同分母比大小：3/5 与 2/5",
          activity: "用两张同样大的纸分别涂 3/5 和 2/5，比一比谁大。",
          question: "分母相同，怎样比较大小？",
          conclusion: "分母相同，分子大的分数大。",
          teacherNote: "答案：3/5 > 2/5；易错：把分子大小比反；时间 10 分钟。",
          visualHint: "配图：两张同尺寸纸条分别涂 3/5、2/5。",
        },
        {
          label: "反例辨析",
          minutes: 4,
          title: "分母不同，能直接比分子吗",
          activity: "判断 1/3 与 1/5 能不能直接比分子，并说明理由。",
          question: "分母不同，能直接比分子吗？",
          conclusion: "不能；本课时只比较同分母分数。",
          teacherNote: "答案：不能；异分母比较留到下一课时；时间 4 分钟。",
          visualHint: "配图：1/3 与 1/5 的对比图（不同等分）。",
        },
        {
          label: "课堂练习",
          minutes: 9,
          title: "课堂练习：涂一涂、比一比",
          activity: "独立完成 3 题，同桌互评并说出比较依据。",
          question: "你比较时先看什么？",
          conclusion: "先看分母是否相同，再看分子大小。",
          teacherNote:
            "答案：1) 3/4 2) 4/7 > 2/7 3) 5/8 > 3/8；互评：分母相同 + 比分子；时间 9 分钟。",
          visualHint: "配图：同分母分数比较题卡。",
        },
        {
          label: "课堂小结",
          minutes: 2,
          title: "一句话说清本课结论",
          activity: "用一句话说给同桌听，并举一个同分母比较的例子。",
          question: "同分母分数怎样比大小？",
          conclusion: "分母相同，分子大的分数大。",
          teacherNote: "答案：比分子；作业：完成课本同分母比较练习；时间 2 分钟。",
          visualHint: "配图：同分母比较的结构图。",
        },
      ],
    };
  }
  return null;
}

function genericFlow(
  brief: PptBrief,
  meta: LessonMeta,
  sections: TopicSections,
): FlowPlan {
  const concepts = sections.concepts;
  const per = Math.max(1, Math.ceil(concepts.length / Math.max(1, brief.totalPeriods)));
  const start = (brief.period - 1) * per;
  const own = concepts.slice(start, start + per);
  const rest = concepts.filter((_, index) => index < start || index >= start + per);
  const focus = own[0]?.title ?? sections.intro.title;
  const boundary = [
    brief.courseType === "review"
      ? "本课时只复习：本单元知识网络、典型例题与错题讲评。"
      : brief.courseType === "practice"
        ? "本课时只练习：本课时的核心方法，不讲新知识。"
        : `本课时只教：${own.map((item) => item.title).join("、") || focus}。`,
    brief.courseType === "review"
      ? "本课时不教：新课时内容与超纲题。"
      : `本课时不教：${rest.map((item) => item.title).join("、") || "后续课时内容"}。`,
    `可观察目标：能说出「${focus}」的关键结论，并独立完成 1 道练习。`,
  ];

  const steps: FlowStep[] = [];
  steps.push({
    label: brief.courseType === "review" ? "知识回顾" : "情景导入",
    minutes: 5,
    title: sections.intro.title,
    activity: "读情景，和同桌说一说你看到了什么。",
    question: "你发现了什么？",
    conclusion: shorten(sections.intro.bullets[1] ?? "从情景里找到本课要研究的问题。", 30),
    teacherNote: "答案不唯一：鼓励学生说完整；时间 5 分钟。",
    visualHint: visualFor(meta.subject, sections.intro.title),
  });

  (own.length ? own : concepts.slice(0, 1)).forEach((concept, index) => {
    steps.push({
      label: `探究${index + 1}`,
      minutes: 10,
      title: concept.title,
      activity: activityFor(meta.subject),
      question: "这一步的关键是什么？",
      conclusion: shorten(concept.bullets[0] ?? concept.title, 30),
      teacherNote: `答案：${concept.bullets[1] ?? concept.bullets[0] ?? "见课本"}；易错：只说结论不说理由；时间 10 分钟。`,
      visualHint: visualFor(meta.subject, concept.title),
    });
  });

  steps.push({
    label: "案例分析",
    minutes: 8,
    title: `案例：${sections.example.title}`,
    activity: "跟着案例做一遍，把关键步骤写下来。",
    question: "这一步为什么这样做？",
    conclusion: shorten(sections.example.bullets[0] ?? "按步骤完成案例。", 30),
    teacherNote: "答案：按示例步骤；易错：跳步、不写理由；时间 8 分钟。",
    visualHint: visualFor(meta.subject, sections.example.title),
  });

  steps.push({
    label: brief.courseType === "review" ? "综合练习" : "课堂练习",
    minutes: 10,
    title: sections.practice.title,
    activity: "独立完成练习，同桌互评并说出依据。",
    question: "你的依据是什么？",
    conclusion: shorten(sections.practice.bullets[0] ?? "按步骤完成练习。", 30),
    teacherNote: "答案：见练习卡；互评标准：步骤完整、答案正确；时间 10 分钟。",
    visualHint: visualFor(meta.subject, sections.practice.title),
  });

  steps.push({
    label: "课堂小结",
    minutes: 4,
    title: "一句话说清本课学了什么",
    activity: "用一句话说给同桌听，并举一个例子。",
    question: "今天最重要的结论是什么？",
    conclusion: shorten(sections.summary[0] ?? "整理本课要点。", 30),
    teacherNote: `作业：${sections.homework[0] ?? "完成课本练习"}；时间 4 分钟。`,
    visualHint: visualFor(meta.subject, "本课结构"),
  });

  return { boundary, steps: scaleSteps(steps, brief.minutes) };
}

function buildFlow(brief: PptBrief, meta: LessonMeta, sections: TopicSections): FlowPlan {
  if (meta.subject === "数学" && /分数/.test(meta.lesson) && brief.courseType === "new") {
    const plan = fractionFlow(brief.period);
    if (plan) {
      return {
        boundary: plan.boundary,
        steps: scaleSteps(
          plan.steps.map((step) => ({ ...step, ...(FRACTION_ENRICH[step.title] ?? {}) })),
          brief.minutes,
        ),
      };
    }
  }
  const plan = genericFlow(brief, meta, sections);
  return {
    boundary: plan.boundary,
    steps: plan.steps.map((step, index) => ({
      ...step,
      game: step.game ?? `第 ${index + 1} 关`,
      tier: step.tier ?? (index === 0 || /练习|小结/.test(step.label) ? 1 : 2),
      mnemonic: step.mnemonic ?? shorten(sections.summary[0] ?? "读一读，记一记。", 24),
    })),
  };
}

function lessonSlide(step: FlowStep): PptSlide {
  return {
    kind: "lesson",
    kicker: `${step.game ?? step.label} · ${step.minutes} 分钟`,
    title: step.title,
    bullets: [],
    activity: step.activity,
    question: step.question,
    conclusion: step.conclusion,
    teacherNote: step.teacherNote,
    visualHint: step.visualHint,
    mnemonic: step.mnemonic,
    minutes: step.minutes,
  };
}

function variantSlide(step: FlowStep, index: number): PptSlide {
  return {
    kind: "lesson",
    kicker: "变式练习",
    title: `变式练习（${index}）`,
    bullets: [],
    activity: "换一道同类题独立完成，把关键步骤写下来。",
    question: "这道题和刚才那道有什么不同？",
    conclusion: step.conclusion,
    teacherNote: "机动时间从课堂练习中调整；答案：见题卡；互评：步骤完整、答案正确。",
    visualHint: "配图：同类题卡与答案页。",
  };
}

// 把配套试题变成课中练题页：题目在屏幕，答案与解析只在讲者备注
function quizSlides(quiz: Quiz): PptSlide[] {
  const scenes = ["星星谷", "过河关", "宝箱关", "登顶关"];
  return quiz.questions.map((question, index) => {
    const scene = scenes[index % scenes.length];
    const game = `第 ${index + 1} 关 · ${scene}`;
    const options = question.options?.length
      ? `选项：${question.options
          .map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`)
          .join(" ")}`
      : "";
    return {
      kind: "lesson",
      kicker: `${game} · ${question.type} · 答对得星`,
      title: `${game}：${question.type}题`,
      bullets: [],
      activity: "闯关答题：独立完成，答对点亮 1 颗星。",
      question: "这道题的关键条件是什么？",
      conclusion: "和同桌互评，说清判断依据。",
      visualHint: `情境：数学探险队闯${scene}。题目：${shorten(question.stem, 58)}${
        options ? ` ${shorten(options, 68)}` : ""
      }`,
      mnemonic: "审题 → 找条件 → 作答 → 点亮星星",
      teacherNote: `答案：${trimTail(question.answer)}；解析：${shorten(
        trimTail(question.explanation),
        60,
      )}；互评：答案 + 依据。`,
      minutes: 3,
    };
  });
}

export function buildPptBrief(args: {
  brief?: Partial<PptBrief>;
  lessonType?: LessonType;
}): PptBrief {
  const courseType: PptCourseType =
    args.brief?.courseType ?? (args.lessonType === "review" ? "review" : "new");
  const totalPeriods = Math.max(1, Math.round(args.brief?.totalPeriods ?? 2));
  const period = Math.min(totalPeriods, Math.max(1, Math.round(args.brief?.period ?? 1)));
  return {
    volume: args.brief?.volume ?? "上册",
    period,
    totalPeriods,
    minutes: args.brief?.minutes === 35 ? 35 : 40,
    courseType,
    level: args.brief?.level ?? "基础一般",
    aids: args.brief?.aids?.length ? [...args.brief.aids] : ["纸", "彩笔"],
  };
}

function questionCount(text: string): number {
  return (text.match(/[？?]/g) ?? []).length;
}

function screenLines(slide: PptSlide): number {
  const texts = [slide.activity, slide.question, slide.conclusion].filter(
    (item): item is string => !!item,
  );
  return texts.reduce((sum, text) => sum + Math.ceil(text.length / 30), 0);
}

function runChecks(
  deck: PptDeck,
  brief: PptBrief,
  plan: FlowPlan,
): PptCheck[] {
  const lessonSlides = deck.slides.filter((slide) => slide.kind === "lesson");
  const flowSlides = lessonSlides.filter((slide) => slide.bullets.length === 0);
  const conceptSlides = flowSlides.filter(
    (slide) =>
      !(slide.kicker ?? "").includes("答对得星") &&
      !(slide.kicker ?? "").includes("课中练题"),
  );
  const timeSum = plan.steps.reduce((sum, step) => sum + step.minutes, 0);
  const onScreen = lessonSlides
    .map((slide) =>
      [
        slide.title,
        ...slide.bullets,
        slide.activity,
        slide.question,
        slide.conclusion,
        slide.visualHint,
      ].join(" "),
    )
    .join(" ");
  const practice = deck.slides.find((slide) => slide.title.includes("练习"));
  const goal = deck.slides.find((slide) =>
    slide.bullets.some((item) => item.includes("可观察目标")),
  );

  return [
    {
      label: "课时边界明确",
      ok: deck.slides.some((slide) => slide.bullets.some((item) => item.includes("不教"))),
      hint: "只写本课时教什么、不教什么",
    },
    {
      label: `环节时间 = ${brief.minutes} 分钟`,
      ok: timeSum === brief.minutes,
      hint: `当前合计 ${timeSum} 分钟`,
    },
    {
      label: "屏幕正文 ≤ 3 行",
      ok: flowSlides.length > 0 && flowSlides.every((slide) => screenLines(slide) <= 3),
      hint: "活动 + 问题 + 结论合计不超过 3 行",
    },
    {
      label: "每页只有 1 个问题",
      ok:
        conceptSlides.length > 0 &&
        conceptSlides.every(
          (slide) =>
            questionCount(slide.question ?? "") === 1 &&
            questionCount(
              [slide.title, slide.activity, slide.conclusion, slide.visualHint].join(" "),
            ) === 0,
        ),
      hint: "正文只保留 1 个核心提问",
    },
    {
      label: "每页都有学生动作",
      ok: flowSlides.length > 0 && flowSlides.every((slide) => (slide.activity ?? "").length > 0),
    },
    {
      label: "每页有具体配图",
      ok:
        conceptSlides.length > 0 &&
        conceptSlides.every(
          (slide) =>
            (slide.visualHint ?? "").length >= 20 &&
            /[圆方]|三角|左|右|红|绿|橙|蓝/.test(slide.visualHint ?? ""),
        ),
      hint: "写清图形、颜色与数量",
    },
    {
      label: "每页有口诀 / 板书",
      ok: flowSlides.length > 0 && flowSlides.every((slide) => (slide.mnemonic ?? "").length > 0),
    },
    {
      label: "环节游戏化",
      ok:
        conceptSlides.length > 0 &&
        conceptSlides.every((slide) => /关|星|探险/.test(slide.kicker ?? "")),
      hint: "用闯关 / 探险 / 收星星包装环节",
    },
    {
      label: "答案只在备注",
      ok: !/答案|答：/.test(onScreen),
      hint: "答案、易错点、时间放进讲者备注",
    },
    {
      label: "练习含答案与互评",
      ok:
        !!practice &&
        /答案/.test(practice.teacherNote ?? "") &&
        /互评/.test(practice.teacherNote ?? ""),
    },
    {
      label: "已清除装饰与教案词",
      ok:
        !DECOR.test(onScreen) &&
        !/学生得出|学生做什么|教师问什么|教师备注|配图建议|教学目标|学习目标|设计意图|教案/.test(
          onScreen,
        ),
    },
    {
      label: "目标可观察",
      ok: !!goal && /能/.test(goal.bullets.join(" ")),
    },
  ];
}

export function generatePptDeck(args: {
  meta: LessonMeta;
  author: string;
  school: string;
  lessonType?: LessonType;
  knowledgeRange?: string;
  pageCount?: number;
  brief?: Partial<PptBrief>;
  quiz?: Quiz;
}): PptDeck {
  const { meta } = args;
  const brief = buildPptBrief({ brief: args.brief, lessonType: args.lessonType });
  const sections = buildTopicSections(meta, args.lessonType, args.knowledgeRange);
  const plan = buildFlow(brief, meta, sections);
  const pageCount = normalizePageCount(args.pageCount);

  const boundarySlide: PptSlide = {
    kind: "lesson",
    kicker: "课时边界",
    title: "本课时只学这一小步",
    bullets: plan.boundary,
    activity: "读边界，圈出「只教」和「不教」。",
    question: "这节课要完成哪一件事？",
    conclusion: "只学这一小步，不提前抢跑。",
    teacherNote: "课前说明 1 分钟，不计入环节时间。",
    visualHint: "配图：本单元课时路线图（第 1 课时 / 第 2 课时）。",
  };

  const timeSum = plan.steps.reduce((sum, step) => sum + step.minutes, 0);
  const timePlanSlide: PptSlide = {
    kind: "lesson",
    kicker: "环节时间",
    title: "教学环节与时间",
    bullets: plan.steps.map(
      (step) => `${step.game ?? step.label} · ${step.minutes} 分钟：${step.title}`,
    ),
    activity: "看时间轴，知道每一步要做什么。",
    question: `${brief.minutes} 分钟怎样分配？`,
    conclusion: `各环节时间加总 = ${timeSum} 分钟。`,
    teacherNote: `合计 ${timeSum} 分钟；如超时，优先压缩练习讲评。`,
    visualHint: "配图：横向时间轴。",
  };

  const stepEntries = plan.steps.map((step, index) => ({
    slide: lessonSlide(step),
    tier: step.tier ?? 2,
    index: index + 2,
  }));
  const ranked = [
    { slide: boundarySlide, tier: 0, index: 0 },
    { slide: timePlanSlide, tier: 0, index: 1 },
    ...stepEntries,
  ];

  const capacity = Math.max(1, pageCount - 2);
  const chosen =
    ranked.length <= capacity
      ? ranked
      : ranked
          .slice()
          .sort((a, b) => a.tier - b.tier || a.index - b.index)
          .slice(0, capacity);
  const chosenIndexes = new Set(chosen.map((item) => item.index));
  const contentSlides = ranked
    .filter((item) => chosenIndexes.has(item.index))
    .map((item) => item.slide);

  const basePractice = plan.steps[plan.steps.length - 2] ?? plan.steps[0];
  let variant = 1;
  while (contentSlides.length < capacity) {
    contentSlides.push(variantSlide(basePractice, variant));
    variant += 1;
    if (variant > 40) break;
  }

  const cover: PptSlide = {
    kind: "cover",
    kicker: `${meta.textbook} · ${meta.grade}${brief.volume} · ${COURSE_TYPE_LABEL[brief.courseType]} · 第 ${brief.period}/${brief.totalPeriods} 课时 · ${brief.minutes} 分钟`,
    title: `${meta.grade}${meta.subject} · ${meta.lesson}（第 ${brief.period} 课时）`,
    bullets: [
      `授课教师：${args.author}`,
      `学情：${brief.level} · 教具：${brief.aids.join("、")}`,
    ],
    note: "乡课 · 教学设计",
  };

  const closing: PptSlide = {
    kind: "closing",
    title: "把这一小步讲扎实",
    bullets: ["回到课时边界，检查学生是否做到", "用一道题检验是否真正掌握", "乡课 · 让村小也能备一堂好课"],
  };

  const plannedSlides = contentSlides.map((slide) =>
    slide.kind === "lesson" &&
    slide.activity &&
    slide.bullets.length === 0 &&
    !(slide.kicker ?? "").includes("答对得星")
      ? {
          ...slide,
          visualPlan: buildVisualPlan({
            hint: slide.visualHint ?? "",
            title: slide.title,
            lesson: meta.lesson,
            subject: meta.subject,
            grade: meta.grade,
            question: slide.question,
            conclusion: slide.conclusion,
          }),
        }
      : slide,
  );

  const deck: PptDeck = {
    title: meta.lesson,
    subtitle: `${meta.grade}${meta.subject} · ${meta.textbook}${brief.volume} · 第 ${brief.period} 课时`,
    author: args.author,
    school: args.school,
    slides: [
      cover,
      ...plannedSlides,
      ...(args.quiz ? quizSlides(args.quiz) : []),
      closing,
    ],
    brief,
    meta: { subject: meta.subject, grade: meta.grade, lesson: meta.lesson },
  };
  deck.checks = runChecks(deck, brief, plan);
  return deck;
}

import type { ScanResult } from "./types";
import { uid } from "./engine";

const SAMPLE_QUESTIONS = [
  {
    no: "1",
    content: "3/4 + 1/4 =",
    studentAnswer: "4/8",
    correctAnswer: "1",
    correct: false,
    errorTag: "同分母分数加减法",
    errorReason: "把分母也相加了。同分母分数相加，分母不变，只把分子相加，结果 4/4 = 1。",
  },
  {
    no: "2",
    content: "1 - 2/5 =",
    studentAnswer: "3/5",
    correctAnswer: "3/5",
    correct: true,
  },
  {
    no: "3",
    content: "一根绳子平均分成 8 段，每段是全长的几分之几？",
    studentAnswer: "1/8",
    correctAnswer: "1/8",
    correct: true,
  },
  {
    no: "4",
    content: "比较大小：3/5 ○ 2/5",
    studentAnswer: "3/5 < 2/5",
    correctAnswer: "3/5 > 2/5",
    correct: false,
    errorTag: "分数大小比较",
    errorReason: "同分母分数比较，分子大的分数就大。3 个 1/5 比 2 个 1/5 多，所以 3/5 > 2/5。",
  },
  {
    no: "5",
    content: "2/6 + 3/6 =",
    studentAnswer: "5/6",
    correctAnswer: "5/6",
    correct: true,
  },
  {
    no: "6",
    content: "一杯水喝了 1/4，还剩几分之几？",
    studentAnswer: "3/4",
    correctAnswer: "3/4",
    correct: true,
  },
  {
    no: "7",
    content: "5/7 - 2/7 =",
    studentAnswer: "3/0",
    correctAnswer: "3/7",
    correct: false,
    errorTag: "同分母分数加减法",
    errorReason: "分母写成了 0。分母表示平均分成的份数，减法中份数不变，应是 3/7。",
  },
  {
    no: "8",
    content: "判断：所有分数都小于 1。",
    studentAnswer: "对",
    correctAnswer: "错",
    correct: false,
    errorTag: "分数的概念理解",
    errorReason: "当分子等于分母时分数等于 1（如 6/6），分子大于分母时分数大于 1（如 5/4）。",
  },
];

const DISTRIBUTION = [
  {
    tag: "同分母分数加减法",
    count: 2,
    hint: "分母相加、分母写 0 —— 核心是「分母不变，分子相加减」",
  },
  {
    tag: "分数大小比较",
    count: 1,
    hint: "同分母比分子，分子大的分数大",
  },
  {
    tag: "分数的概念理解",
    count: 1,
    hint: "分数不一定小于 1，需要区分真分数与假分数",
  },
];

const SCRIPT = [
  {
    minutes: 1,
    title: "总体反馈（0–1 分钟）",
    detail:
      "8 道题答对 4 道，正确率 50%。先肯定书写工整、单位名称完整；再点出两个集中问题：同分母加减法中的分母处理，以及分数大小比较与概念理解。",
  },
  {
    minutes: 3,
    title: "典型错例一（1–4 分钟）",
    detail:
      "展示 3/4 + 1/4 = 4/8 与 5/7 - 2/7 = 3/0。用两张纸条分别折出 3/4 和 1/4，拼在一起正好是整张，说明结果应是 1。强调：分母是平均分成的份数，份数不变；变的是取的份数。全班齐说口诀「分母不变，分子相加减」。",
  },
  {
    minutes: 2,
    title: "典型错例二（4–6 分钟）",
    detail:
      "展示 3/5 < 2/5。板书两条同样长的线段，分别五等分涂 3 份、2 份，让学生用眼睛比。追问「所有分数都小于 1 吗？」，用 4/4、5/4 举例，纠正第 8 题。",
  },
  {
    minutes: 2,
    title: "变式练习（6–8 分钟）",
    detail:
      "当堂完成四道变式：2/9 + 5/9、7/8 - 3/8、比较 4/7 与 2/7、判断 6/6。要求学生边做边说出口诀，教师巡视收集新的错误。",
  },
  {
    minutes: 2,
    title: "补救追踪（8–10 分钟）",
    detail:
      "布置 4 道同类练习作为课后小练；对仍出错的两名学生，课后用纸条操作单独辅导；明天晨读安排 3 分钟同分母口算，检查订正效果。",
  },
];

const EXERCISES = [
  { question: "2/9 + 5/9 = ？", answer: "7/9" },
  { question: "7/8 - 3/8 = ？", answer: "4/8，也就是 1/2" },
  { question: "比较大小：4/7 ○ 2/7", answer: "4/7 > 2/7" },
  { question: "判断：6/6 = 1", answer: "对" },
  {
    question: "一根绳子平均分成 10 段，用去 3 段，用去全长的几分之几？还剩几分之几？",
    answer: "用去 3/10，还剩 7/10",
  },
];

export function createSampleScan(source: "sample" | "upload" = "sample"): ScanResult {
  const now = new Date().toISOString();
  return {
    id: uid("scan"),
    title: source === "upload" ? "作业照片识别 · 分数练习" : "分数单元随堂小测 · 8 题",
    createdAt: now,
    total: SAMPLE_QUESTIONS.length,
    wrong: SAMPLE_QUESTIONS.filter((item) => !item.correct).length,
    questions: SAMPLE_QUESTIONS.map((item) => ({ ...item })),
    distribution: DISTRIBUTION.map((item) => ({ ...item })),
    script: SCRIPT.map((item) => ({ ...item })),
    exercises: EXERCISES.map((item) => ({ ...item })),
    source,
  };
}

export function seedScan(): ScanResult {
  return {
    ...createSampleScan("sample"),
    id: "scan-seed-fraction",
    title: "分数单元随堂小测 · 讲评记录",
    createdAt: new Date("2026-10-28T19:40:00+08:00").toISOString(),
  };
}
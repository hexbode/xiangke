export const GRADES = [
  "一年级",
  "二年级",
  "三年级",
  "四年级",
  "五年级",
  "六年级",
  "七年级",
  "八年级",
  "九年级",
] as const;
export type Grade = (typeof GRADES)[number];

// 全国 34 个省级行政区（含港澳台）
export const PROVINCES = [
  "北京",
  "天津",
  "河北",
  "山西",
  "内蒙古",
  "辽宁",
  "吉林",
  "黑龙江",
  "上海",
  "江苏",
  "浙江",
  "安徽",
  "福建",
  "江西",
  "山东",
  "河南",
  "湖北",
  "湖南",
  "广东",
  "广西",
  "海南",
  "重庆",
  "四川",
  "贵州",
  "云南",
  "西藏",
  "陕西",
  "甘肃",
  "青海",
  "宁夏",
  "新疆",
  "台湾",
  "香港",
  "澳门",
] as const;
export type Province = (typeof PROVINCES)[number];

export const SUBJECTS = ["语文", "数学", "科学", "道德与法治", "英语"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const TEXTBOOKS = ["统编版", "人教版", "北师大版", "苏教版", "教科版"] as const;
export type Textbook = (typeof TEXTBOOKS)[number];

export const MEDIA_OPTIONS = ["无设备", "仅电视", "有白板"] as const;
export type MediaCondition = (typeof MEDIA_OPTIONS)[number];

export const AID_OPTIONS = ["无", "可自备", "有限教具箱"] as const;
export type AidCondition = (typeof AID_OPTIONS)[number];

export const CLASS_OPTIONS = ["复式班", "小班", "大班"] as const;
export type ClassCondition = (typeof CLASS_OPTIONS)[number];

export const LEVEL_OPTIONS = ["待补基础", "正常", "学有余力"] as const;
export type LevelCondition = (typeof LEVEL_OPTIONS)[number];

export interface RuralConditions {
  media: MediaCondition;
  aids: AidCondition;
  classType: ClassCondition;
  minutes: 30 | 40;
  level: LevelCondition;
}

export const SCHOOL_DEFAULTS: RuralConditions = {
  media: "无设备",
  aids: "无",
  classType: "小班",
  minutes: 40,
  level: "正常",
};

export interface LessonMeta {
  textbook: Textbook;
  grade: Grade;
  subject: Subject;
  lesson: string;
}

export interface LessonStage {
  stage: string;
  minutes: number;
  teacher: string;
  student: string;
  fallback?: string;
}

export interface LessonContent {
  objectives: string[];
  keyPoints: string[];
  difficulties: string[];
  process: LessonStage[];
  boardDesign: string[];
  questions: { basic: string[]; advanced: string[] };
  homework: { basic: string[]; advanced: string[]; extended: string[] };
  materialSubstitutes: string[];
  reflectionPrompts: string[];
  adaptations: string[];
}

export type PlanStatus = "private" | "original" | "certified";

export type LessonType = "new" | "review";

export const QUIZ_DIFFICULTIES = ["基础", "适中", "挑战"] as const;
export type QuizDifficulty = (typeof QUIZ_DIFFICULTIES)[number];

export const QUIZ_TYPES = ["选择", "填空", "判断", "综合应用"] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

export const QUIZ_COUNTS = [5, 8, 10, 12, 15] as const;

export interface QuizSettings {
  enabled: boolean;
  difficulty: QuizDifficulty;
  count: number;
  types: QuizType[];
}

export interface QuizQuestion {
  no: number;
  type: QuizType;
  difficulty: QuizDifficulty;
  knowledge: string;
  stem: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface Quiz {
  title: string;
  knowledgeRange: string;
  difficulty: QuizDifficulty;
  count: number;
  types: QuizType[];
  questions: QuizQuestion[];
}

export type PptSlideKind =
  | "cover"
  | "agenda"
  | "teaching"
  | "objectives"
  | "scenario"
  | "intro"
  | "concept"
  | "case"
  | "example"
  | "practice"
  | "summary"
  | "homework"
  | "lesson"
  | "closing";

export type VisualPlanType = "mermaid" | "python-pptx" | "ai-prompt" | "ppt-params";

export interface VisualPlanShape {
  type: "circle" | "square" | "triangle";
  count: number;
  color: string;
  rows: number;
  cols: number;
  label?: string;
}

export interface PptVisualPlan {
  type: VisualPlanType;
  summary: string;
  /** 树状图 / 逻辑关系：可直接渲染的 Mermaid 代码 */
  mermaid?: string;
  mermaidNodes?: { id: string; label: string }[];
  mermaidEdges?: { from: string; to: string }[];
  /** 几何图形 / 数量对应：可直接运行的 python-pptx 代码 */
  python?: string;
  /** 情境插图：中英文 AI 绘画提示词 */
  promptZh?: string;
  promptEn?: string;
  /** 简单排版：PPT 形状参数 */
  params?: {
    shapes: VisualPlanShape[];
    rows: number;
    cols: number;
    note: string;
  };
}

export interface PptSlide {
  kind: PptSlideKind;
  kicker?: string;
  title: string;
  bullets: string[];
  note?: string;
  /** 学生做什么：折 / 涂 / 说 / 比 / 评 */
  activity?: string;
  /** 教师核心提问（每页 1 个） */
  question?: string;
  /** 学生得出的结论 */
  conclusion?: string;
  /** 教师备注：答案、易错点、时间 */
  teacherNote?: string;
  /** 配图建议：具体到图形、颜色与数量 */
  visualHint?: string;
  /** 配图方案：Mermaid / python-pptx / AI 提示词 / PPT 参数 */
  visualPlan?: PptVisualPlan;
  /** 口诀 / 板书结论 */
  mnemonic?: string;
  /** 本页对应环节时长（分钟） */
  minutes?: number;
}

export type PptCourseType = "new" | "practice" | "review";

export interface PptBrief {
  volume: string;
  period: number;
  totalPeriods: number;
  minutes: 35 | 40;
  courseType: PptCourseType;
  level: string;
  aids: string[];
}

export interface PptCheck {
  label: string;
  ok: boolean;
  hint?: string;
}

export interface PptDeck {
  title: string;
  subtitle: string;
  author: string;
  school: string;
  slides: PptSlide[];
  brief?: PptBrief;
  checks?: PptCheck[];
  /** 课题信息：用于图解区匹配网络素材 */
  meta?: { subject: string; grade: string; lesson: string };
}

export interface Plan {
  id: string;
  meta: LessonMeta;
  conditions: RuralConditions;
  content: LessonContent;
  authorId: string;
  authorName: string;
  schoolId: string;
  school: string;
  province: string;
  county: string;
  lessonType?: LessonType;
  knowledgeRange?: string;
  quiz?: Quiz;
  ppt?: PptDeck;
  status: PlanStatus;
  sourcePlanId?: string;
  forkNote?: string;
  reuseCount: number;
  ratingSum: number;
  ratingCount: number;
  reviewNote?: string;
  reviewerName?: string;
  reviewedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRecord {
  id: string;
  planId: string;
  planTitle: string;
  submitter: string;
  reviewer: string;
  decision: "approved" | "returned";
  note: string;
  at: string;
}

export interface FeedbackRecord {
  id: string;
  planId: string;
  text: string;
  at: string;
  by: string;
}

export interface ScanQuestion {
  no: string;
  content: string;
  studentAnswer: string;
  correctAnswer: string;
  correct: boolean;
  errorTag?: string;
  errorReason?: string;
}

export interface ScanResult {
  id: string;
  title: string;
  createdAt: string;
  total: number;
  wrong: number;
  questions: ScanQuestion[];
  distribution: { tag: string; count: number; hint: string }[];
  script: { minutes: number; title: string; detail: string }[];
  exercises: { question: string; answer: string }[];
  source: "sample" | "upload";
}

export interface School {
  id: string;
  name: string;
  province: string;
  county: string;
  stage: string;
  classes: number;
  students: number;
  conditions: RuralConditions;
}

export interface Teacher {
  id: string;
  name: string;
  schoolId: string;
  school: string;
  province: string;
  county: string;
  subjects: string[];
  years: number;
  points: number;
  title: string;
}

export type Role = "teacher" | "reviewer";

export interface LoginProfile {
  name: string;
  province: string;
  county: string;
  role: Role;
}

export const STATE_VERSION = 12;

export interface AppState {
  version: number;
  role: Role;
  teacher: Teacher;
  reviewerName: string;
  profile?: LoginProfile | null;
  schools: School[];
  plans: Plan[];
  reviews: ReviewRecord[];
  scans: ScanResult[];
  feedbacks: FeedbackRecord[];
  myRatings: Record<string, number>;
}

export interface GenerateInput {
  meta: LessonMeta;
  conditions: RuralConditions;
  lessonType?: LessonType;
  knowledgeRange?: string;
  quizSettings?: QuizSettings;
  pptEnabled?: boolean;
  pptPageCount?: number;
  sourcePlanId?: string;
  forkNote?: string;
}

export const GRADE_SHORT: Record<Grade, string> = {
  一年级: "一",
  二年级: "二",
  三年级: "三",
  四年级: "四",
  五年级: "五",
  六年级: "六",
  七年级: "七",
  八年级: "八",
  九年级: "九",
};

export const STATUS_LABEL: Record<PlanStatus, string> = {
  private: "私有",
  original: "教师原创",
  certified: "全国认证",
};
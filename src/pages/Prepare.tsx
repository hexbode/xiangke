import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Mic, Sparkles, TriangleAlert, Wand2 } from "lucide-react";
import { FieldLabel, Chip, PageHeader, Sheet, StepDots, Toggle } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { parseUtterance } from "@/lib/parse";
import { navigate } from "@/lib/router";
import { useStore } from "@/lib/store";
import { SUGGESTIONS } from "@/lib/suggestions";
import type { LessonSuggestion } from "@/lib/suggestions";
import {
  AID_OPTIONS,
  CLASS_OPTIONS,
  GRADES,
  LEVEL_OPTIONS,
  MEDIA_OPTIONS,
  QUIZ_COUNTS,
  QUIZ_DIFFICULTIES,
  QUIZ_TYPES,
  SCHOOL_DEFAULTS,
  SUBJECTS,
  TEXTBOOKS,
} from "@/lib/types";
import type {
  LessonMeta,
  LessonType,
  QuizDifficulty,
  QuizSettings,
  QuizType,
  RuralConditions,
} from "@/lib/types";

const GEN_STEPS = [
  "继承学校默认条件，锁定乡村约束",
  "对照课程标准与教材目录结构",
  "编排无多媒体教学过程与时间分配",
  "生成分层提问、三层作业与板书设计",
  "校验教具替代方案与安全提示",
];

const BASE_QUIZ: QuizSettings = {
  enabled: true,
  difficulty: "适中",
  count: 10,
  types: ["选择", "填空", "判断", "综合应用"],
};

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function PreparePage() {
  const { state, generatePlan } = useStore();
  const toast = useToast();
  const school = state.schools.find((item) => item.id === state.teacher.schoolId);
  const defaults = school?.conditions ?? SCHOOL_DEFAULTS;

  const [step, setStep] = useState(0);
  const [lessonType, setLessonType] = useState<LessonType>("new");
  const [knowledgeRange, setKnowledgeRange] = useState("");
  const [meta, setMeta] = useState<LessonMeta>({
    textbook: "人教版",
    grade: "三年级",
    subject: "数学",
    lesson: "分数的初步认识",
  });
  const [lesson, setLesson] = useState(meta.lesson);
  const [conditions, setConditions] = useState<RuralConditions>({ ...defaults });
  const [quizEnabled, setQuizEnabled] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState<QuizDifficulty>(BASE_QUIZ.difficulty);
  const [quizCount, setQuizCount] = useState(BASE_QUIZ.count);
  const [quizTypes, setQuizTypes] = useState<QuizType[]>(BASE_QUIZ.types);
  const [pptEnabled, setPptEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<RecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // 识别尚未启动时 stop 会抛错，忽略即可。
      }
    };
  }, []);

  const setCondition = <K extends keyof RuralConditions>(key: K, value: RuralConditions[K]) => {
    setConditions((prev) => ({ ...prev, [key]: value }));
  };

  const applyLessonType = (type: LessonType) => {
    setLessonType(type);
    if (type === "review" && lessonType !== "review") {
      setKnowledgeRange(
        (prev) =>
          prev.trim() ||
          `${meta.grade}${meta.subject} · ${(lesson || meta.lesson).trim()} · 本单元`,
      );
      setQuizEnabled(true);
    }
  };

  const toggleQuizType = (type: QuizType) => {
    setQuizTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) {
          toast("至少保留一种题型", "info");
          return prev;
        }
        return prev.filter((item) => item !== type);
      }
      return [...prev, type];
    });
  };

  const applySuggestion = (item: LessonSuggestion) => {
    setLesson(item.lesson);
    setMeta((prev) => ({ ...prev, lesson: item.lesson, grade: item.grade, textbook: item.textbook }));
    if (lessonType === "review") {
      setKnowledgeRange(`${item.grade}${meta.subject} · ${item.lesson} · 本单元`);
    }
  };

  const startListen = () => {
    const globalWindow = window as unknown as {
      SpeechRecognition?: new () => RecognitionLike;
      webkitSpeechRecognition?: new () => RecognitionLike;
    };
    const Ctor = globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceError("当前浏览器不支持语音识别，请在下方直接输入。");
      return;
    }
    try {
      const recognition = new Ctor();
      recognitionRef.current = recognition;
      recognition.lang = "zh-CN";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) setVoiceText(transcript);
        setListening(false);
      };
      recognition.onerror = () => {
        setListening(false);
        setVoiceError("语音识别失败，请在下方直接输入。");
      };
      recognition.onend = () => setListening(false);
      recognition.start();
      setVoiceError("");
      setListening(true);
    } catch {
      setListening(false);
      setVoiceError("无法启动语音识别，请在下方直接输入。");
    }
  };

  const applyVoice = () => {
    if (!voiceText.trim()) return;
    const parsed = parseUtterance(voiceText, defaults);
    setMeta(parsed.meta);
    setLesson(parsed.meta.lesson);
    setConditions(parsed.conditions);
    if (lessonType === "review") {
      setKnowledgeRange(
        `${parsed.meta.grade}${parsed.meta.subject} · ${parsed.meta.lesson} · 本单元`,
      );
    }
    setVoiceOpen(false);
    setVoiceText("");
    setStep(0);
    if (parsed.missing.length > 0) {
      toast(`已填入推测信息，请确认${parsed.missing.join("、")}`, "info");
    } else {
      toast(`已识别：${parsed.understood.slice(0, 4).join(" · ")}`);
    }
  };

  const genSteps = [
    ...GEN_STEPS,
    ...(quizEnabled ? [`生成 ${quizCount} 道配套试题并核对答案`] : []),
    ...(pptEnabled ? ["编排配套 PPT 幻灯片"] : []),
  ];

  const handleGenerate = async () => {
    if (!lesson.trim() || generating) return;
    if (lessonType === "review" && !knowledgeRange.trim()) {
      toast("复习课请先填写知识区间", "info");
      setStep(0);
      return;
    }
    setGenerating(true);
    setGenStep(0);
    for (let index = 0; index < genSteps.length; index += 1) {
      setGenStep(index);
      await delay(430);
    }
    setGenStep(genSteps.length);
    await delay(280);
    const plan = generatePlan({ ...meta, lesson: lesson.trim() }, conditions, {
      lessonType,
      knowledgeRange: lessonType === "review" ? knowledgeRange.trim() : undefined,
      quizSettings: quizEnabled
        ? {
            enabled: true,
            difficulty: quizDifficulty,
            count: quizCount,
            types: quizTypes,
          }
        : undefined,
      pptEnabled,
    });
    setGenerating(false);
    const extras = [
      quizEnabled ? `${quizCount} 道试题` : "",
      pptEnabled ? "配套 PPT" : "",
    ].filter(Boolean);
    toast(
      extras.length > 0
        ? `教案包与${extras.join("、")}已生成，已公开为教师原创`
        : "教案包已生成，已公开为教师原创",
    );
    navigate(`/plan/${plan.id}`);
  };

  const adaptHints: string[] = [];
  adaptHints.push(
    conditions.media === "无设备"
      ? "所有环节改为板书 + 纸笔 + 口述，不依赖投影"
      : conditions.media === "仅电视"
        ? "电视只播放一次关键画面，随后转为板书复述"
        : "白板呈现结构图，保留纸笔操作",
  );
  adaptHints.push(
    conditions.aids === "无"
      ? "教具全部替换为纸条、瓶盖、玉米粒等生活材料"
      : conditions.aids === "可自备"
        ? "提前一天给学生列低成本材料清单"
        : "教具箱按小组轮换使用，附清点提示",
  );
  if (conditions.classType === "复式班") adaptHints.push("加入分年级任务单与「动静交替」环节");
  if (conditions.minutes === 30) adaptHints.push("按 30 分钟重排环节时长，保留核心探究");
  if (conditions.level === "待补基础") adaptHints.push("增加旧知复习，作业以基础层为主");
  if (conditions.level === "学有余力") adaptHints.push("提升与拓展题为主，鼓励学生讲给同伴听");

  const suggestions = SUGGESTIONS[meta.subject];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 0px)" }}>
      <PageHeader
        title="智能备课"
        right={
          <button
            type="button"
            className="icon-btn"
            aria-label="语音速填"
            onClick={() => setVoiceOpen(true)}
          >
            <Mic size={19} />
          </button>
        }
      />

      <div className="page" style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <StepDots current={step + 1} total={2} />
          <span className="tiny muted">第 {step + 1} 步 / 共 2 步</span>
        </div>

        <h1
          className="font-display"
          style={{
            fontSize: "calc(23px * var(--site-type))",
            fontWeight: 700,
            lineHeight: 1.4,
            margin: "14px 0 4px",
          }}
        >
          {step === 0 ? "先定课题，两步就能生成" : "再说说学校有什么"}
        </h1>
        <p className="small muted" style={{ margin: "0 0 16px" }}>
          {step === 0
            ? "先选课型，再定教材、年级、学科与课题。"
            : "这些条件会写进教案，而不是让您课后自己改。"}
        </p>

        {step === 0 ? (
          <>
            <div className="form-block">
              <div className="form-block-title">课型</div>
              <div className="tabs" role="tablist" aria-label="选择课型">
                <button
                  type="button"
                  role="tab"
                  aria-selected={lessonType === "new"}
                  className={`tab ${lessonType === "new" ? "tab--active" : ""}`}
                  onClick={() => applyLessonType("new")}
                >
                  新授课
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={lessonType === "review"}
                  className={`tab ${lessonType === "review" ? "tab--active" : ""}`}
                  onClick={() => applyLessonType("review")}
                >
                  复习课
                </button>
              </div>
              <div className="tiny muted" style={{ marginTop: 7, lineHeight: 1.55 }}>
                {lessonType === "review"
                  ? "复习课按知识网络、典型例题、错题讲评组织，可选择生成配套试题。"
                  : "新授课按导入、探究、练习、小结组织，默认不开试题。"}
              </div>
            </div>

            <div className="form-block">
              <div className="form-block-title">教材版本</div>
              <div className="chip-wrap">
                {TEXTBOOKS.map((book) => (
                  <Chip
                    key={book}
                    active={meta.textbook === book}
                    onClick={() => setMeta((prev) => ({ ...prev, textbook: book }))}
                  >
                    {book}
                  </Chip>
                ))}
              </div>
              <div className="field-hint" style={{ marginTop: 8 }}>
                仅引用教材目录结构，不复制教材正文。
              </div>
            </div>

            <div className="form-block">
              <div className="form-block-title">年级与学科</div>
              <div className="chip-wrap" style={{ marginBottom: 12 }}>
                {GRADES.map((grade) => (
                  <Chip
                    key={grade}
                    active={meta.grade === grade}
                    onClick={() => setMeta((prev) => ({ ...prev, grade }))}
                  >
                    {grade}
                  </Chip>
                ))}
              </div>
              <div className="chip-wrap">
                {SUBJECTS.map((subject) => (
                  <Chip
                    key={subject}
                    active={meta.subject === subject}
                    onClick={() => setMeta((prev) => ({ ...prev, subject }))}
                  >
                    {subject}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="form-block">
              <div className="field">
                <FieldLabel label="课题 / 课时名称" hint="必填" />
                <input
                  className="input"
                  value={lesson}
                  maxLength={30}
                  placeholder="例如：分数的初步认识"
                  onChange={(event) => setLesson(event.target.value)}
                  aria-label="课题名称"
                />
              </div>
              <div className="field-label" style={{ marginTop: 12 }}>
                <span>本学科常用课题</span>
                <span className="field-hint">点选自动带出年级</span>
              </div>
              <div className="chip-wrap">
                {suggestions.map((item) => (
                  <Chip
                    key={item.lesson}
                    small
                    active={lesson === item.lesson && meta.grade === item.grade}
                    onClick={() => applySuggestion(item)}
                  >
                    {item.lesson}
                    <span style={{ opacity: 0.55 }}>{item.grade.replace("年级", "")}</span>
                  </Chip>
                ))}
              </div>
            </div>

            {lessonType === "review" && (
              <div className="form-block">
                <div className="field">
                  <FieldLabel label="知识区间" hint="必填" />
                  <input
                    className="input"
                    value={knowledgeRange}
                    maxLength={60}
                    placeholder="例如：第三单元 · 分数的初步认识与简单计算"
                    onChange={(event) => setKnowledgeRange(event.target.value)}
                    aria-label="知识区间"
                  />
                </div>
                <div className="field-hint" style={{ marginTop: 8 }}>
                  复习环节与配套试题都会围绕这个区间生成。
                </div>
                <div className="chip-wrap" style={{ marginTop: 8 }}>
                  {["本单元", "第一至第三单元", "本学期核心知识"].map((label) => (
                    <Chip
                      key={label}
                      small
                      onClick={() =>
                        setKnowledgeRange(
                          label === "本单元"
                            ? `${meta.grade}${meta.subject} · ${(lesson || meta.lesson).trim()} · 本单元`
                            : `${meta.grade}${meta.subject} · ${label}`,
                        )
                      }
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div className="privacy-note" style={{ marginTop: 12 }}>
              <Sparkles size={15} style={{ flex: "none", marginTop: 1 }} aria-hidden="true" />
              <span>
                课题不在精编库中也能生成：引擎会按学科教学法模板，结合乡村条件产出完整教案包。
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="card card-pad" style={{ marginBottom: 12 }}>
              <div className="eyebrow">将生成的教案</div>
              <div style={{ fontWeight: 700, marginTop: 3 }}>
                {meta.grade}
                {meta.subject}《{lesson}》
              </div>
              <div className="tiny muted">
                {meta.textbook} · {lessonType === "review" ? "复习课" : "新授课"} ·{" "}
                {conditions.minutes} 分钟 · 学情{conditions.level}
              </div>
              {lessonType === "review" && knowledgeRange && (
                <div className="tiny muted">知识区间：{knowledgeRange}</div>
              )}
              <div className="tiny muted">
                {quizEnabled
                  ? `配套试题：${quizCount} 题 · ${quizDifficulty} · ${quizTypes.join(" / ")}`
                  : "配套试题：不生成"}
              </div>
              <div className="tiny muted">
                配套 PPT：{pptEnabled ? "生成 · 按课时流程（默认第 1 课时）" : "不生成"}
              </div>
            </div>

            <div className="banner banner--green" style={{ marginBottom: 12 }}>
              <Check size={15} style={{ flex: "none" }} aria-hidden="true" />
              <span style={{ flex: 1 }}>
                已继承 {school?.name ?? "本校"} 默认条件，可按今天的课堂调整。
              </span>
              <button
                type="button"
                className="link-btn"
                style={{ fontSize: "calc(11px * var(--site-type))", flex: "none" }}
                onClick={() => setConditions({ ...defaults })}
              >
                恢复默认
              </button>
            </div>

            <div className="form-block">
              <div className="form-block-title">多媒体条件</div>
              <div className="chip-wrap">
                {MEDIA_OPTIONS.map((option) => (
                  <Chip
                    key={option}
                    active={conditions.media === option}
                    onClick={() => setCondition("media", option)}
                  >
                    {option}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="form-block">
              <div className="form-block-title">教具条件</div>
              <div className="chip-wrap">
                {AID_OPTIONS.map((option) => (
                  <Chip
                    key={option}
                    active={conditions.aids === option}
                    onClick={() => setCondition("aids", option)}
                  >
                    {option}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="form-block">
              <div className="form-block-title">班级规模</div>
              <div className="chip-wrap">
                {CLASS_OPTIONS.map((option) => (
                  <Chip
                    key={option}
                    active={conditions.classType === option}
                    onClick={() => setCondition("classType", option)}
                  >
                    {option}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="form-block">
              <div className="form-block-title">课时长度</div>
              <div className="chip-wrap">
                {[40, 30].map((minutes) => (
                  <Chip
                    key={minutes}
                    active={conditions.minutes === minutes}
                    onClick={() => setCondition("minutes", minutes as 30 | 40)}
                  >
                    {minutes} 分钟
                  </Chip>
                ))}
              </div>
            </div>

            <div className="form-block">
              <div className="form-block-title">学情基础</div>
              <div className="chip-wrap">
                {LEVEL_OPTIONS.map((option) => (
                  <Chip
                    key={option}
                    active={conditions.level === option}
                    onClick={() => setCondition("level", option)}
                  >
                    {option}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="form-block">
              <div className="form-block-title">配套试题</div>
              <Toggle
                checked={quizEnabled}
                onChange={setQuizEnabled}
                label="生成配套试题"
                desc="含参考答案与解析，随教案保存并可打印"
              />
              {quizEnabled && (
                <div style={{ marginTop: 12 }}>
                  <div className="field-label">
                    <span>试题难度</span>
                  </div>
                  <div className="chip-wrap">
                    {QUIZ_DIFFICULTIES.map((option) => (
                      <Chip
                        key={option}
                        small
                        active={quizDifficulty === option}
                        onClick={() => setQuizDifficulty(option)}
                      >
                        {option}
                      </Chip>
                    ))}
                  </div>

                  <div className="field-label" style={{ marginTop: 12 }}>
                    <span>题数</span>
                  </div>
                  <div className="chip-wrap">
                    {QUIZ_COUNTS.map((option) => (
                      <Chip
                        key={option}
                        small
                        active={quizCount === option}
                        onClick={() => setQuizCount(option)}
                      >
                        {option} 题
                      </Chip>
                    ))}
                  </div>

                  <div className="field-label" style={{ marginTop: 12 }}>
                    <span>题型</span>
                    <span className="field-hint">可多选</span>
                  </div>
                  <div className="chip-wrap">
                    {QUIZ_TYPES.map((option) => (
                      <Chip
                        key={option}
                        small
                        active={quizTypes.includes(option)}
                        onClick={() => toggleQuizType(option)}
                      >
                        {option}
                      </Chip>
                    ))}
                  </div>
                  <div className="field-hint" style={{ marginTop: 8 }}>
                    试题围绕知识区间生成，含答案解析；演示版使用本地题库。
                  </div>
                </div>
              )}
            </div>

            <div className="form-block">
              <div className="form-block-title">配套 PPT</div>
              <Toggle
                checked={pptEnabled}
                onChange={setPptEnabled}
                label="生成配套 PPT"
                desc="按课时生成教学流程课件（默认第 1 课时），支持全屏演示与导出 .pptx"
              />
              <div className="field-hint" style={{ marginTop: 8 }}>
                课件按课时流程生成；勾选配套试题后，题目会自动排成「星星谷 / 过河关」等闯关页，答案与解析只放在讲者备注。
              </div>
              <button
                type="button"
                className="link-btn"
                style={{ marginTop: 8, fontSize: "calc(11.5px * var(--site-type))" }}
                onClick={() => navigate("/courseware")}
              >
                只想做课件？进入课件生成 <ArrowRight size={12} aria-hidden="true" />
              </button>
            </div>

            <div className="adapt-box" style={{ marginTop: 12 }}>
              <div className="adapt-box-title">
                <Wand2 size={14} aria-hidden="true" />
                生成时会这样调整
              </div>
              <ul className="adapt-list">
                {adaptHints.map((hint) => (
                  <li key={hint}>· {hint}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="sticky-actions no-print">
        {step === 1 && (
          <button type="button" className="btn btn-outline" onClick={() => setStep(0)}>
            上一步
          </button>
        )}
        {step === 0 ? (
          <button
            type="button"
            className="btn btn-block"
            disabled={!lesson.trim() || (lessonType === "review" && !knowledgeRange.trim())}
            onClick={() => setStep(1)}
          >
            {lessonType === "review" ? "下一步：设置复习条件" : "下一步：设置乡村条件"}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            style={{ flex: 1 }}
            disabled={!lesson.trim() || generating}
            onClick={handleGenerate}
          >
            <Sparkles size={16} aria-hidden="true" />
            生成教案包
          </button>
        )}
      </div>

      {generating && (
        <div className="gen-overlay no-print" role="status" aria-live="polite">
          <div className="gen-panel">
            <div className="gen-head">
              <span className="gen-orbit" aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, fontSize: "calc(15px * var(--site-type))" }}>
                  正在生成{lessonType === "review" ? "复习课" : ""}教案包
                </div>
                <div className="tiny muted">
                  {meta.grade}
                  {meta.subject}《{lesson}》· {conditions.media} · {conditions.classType}
                </div>
              </div>
            </div>
            <div className="gen-steps">
              {genSteps.map((label, index) => {
                const stateName =
                  index < genStep ? "done" : index === genStep ? "active" : "todo";
                return (
                  <div className={`gen-step gen-step--${stateName}`} key={label}>
                    <span className="gen-check">
                      {index < genStep && <Check size={11} aria-hidden="true" />}
                    </span>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="gen-bar">
              <span style={{ width: `${Math.min(genStep / genSteps.length, 1) * 100}%` }} />
            </div>
            <div className="tiny muted" style={{ marginTop: 10, textAlign: "center" }}>
              演示版由本地规则引擎生成，不调用外部模型
            </div>
          </div>
        </div>
      )}

      <Sheet
        open={voiceOpen}
        onClose={() => {
          recognitionRef.current?.stop();
          setListening(false);
          setVoiceOpen(false);
        }}
        title="语音速填"
        footer={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={startListen}
              aria-label="开始语音输入"
            >
              <Mic size={16} aria-hidden="true" />
              {listening ? "聆听中…" : "开始说话"}
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={applyVoice}
              disabled={!voiceText.trim()}
            >
              识别并填入
            </button>
          </div>
        }
      >
        <p className="small muted" style={{ marginTop: 0 }}>
          一句话说清：年级、学科、课题，再补一句学校条件。例如「三年级数学，人教版，分数，没投影」。
        </p>
        <label className="field">
          <FieldLabel label="说 or 输入" hint="支持自然语言" />
          <textarea
            className="textarea"
            value={voiceText}
            placeholder="例如：四年级语文，秋天的雨，只有电视，复式班，三十分钟"
            onChange={(event) => setVoiceText(event.target.value)}
          />
        </label>
        {voiceError && (
          <div
            className="banner"
            style={{ marginTop: 10, color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, var(--site-surface))", borderColor: "color-mix(in srgb, var(--danger) 25%, var(--site-border))" }}
          >
            <TriangleAlert size={14} aria-hidden="true" />
            <span>{voiceError}</span>
          </div>
        )}
        <div className="field-label" style={{ marginTop: 12 }}>
          <span>试试这些说法</span>
        </div>
        <div className="chip-wrap">
          {[
            "三年级数学 人教版 分数 没投影",
            "四年级语文 秋天的雨 只有电视 复式班",
            "五年级科学 种子发芽 30分钟 没教具",
            "六年级道法 公民的基本权利 大班",
          ].map((example) => (
            <Chip key={example} small onClick={() => setVoiceText(example)}>
              {example}
            </Chip>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
import { useRef, useState } from "react";
import { Check, FileJson, Presentation, Sparkles } from "lucide-react";
import { navigate } from "@/lib/router";
import { Chip, FieldLabel, PageHeader } from "@/components/ui";
import { OerHub } from "@/components/OerHub";
import { PptPreview } from "@/components/PptPreview";
import { useToast } from "@/components/Toast";
import {
  COURSE_TYPE_LABEL,
  generatePptDeck,
  PPT_AID_OPTIONS,
  PPT_LEVEL_OPTIONS,
  VOLUME_OPTIONS,
} from "@/lib/pptEngine";
import { SUGGESTIONS } from "@/lib/suggestions";
import type { LessonSuggestion } from "@/lib/suggestions";
import { useStore } from "@/lib/store";
import { GRADES, SUBJECTS, TEXTBOOKS } from "@/lib/types";
import type {
  Grade,
  LessonMeta,
  PptBrief,
  PptCourseType,
  PptDeck,
  Subject,
  Textbook,
} from "@/lib/types";

const GEN_STEPS = [
  "定课时边界：只教什么、不教什么",
  "定核心活动：折、涂、说或比",
  "分配环节时间：加总等于课时",
  "写每页字段：活动、提问、结论、备注",
  "自检课时、容量与答案",
];

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function CoursewarePage() {
  const { state } = useStore();
  const toast = useToast();
  const [textbook, setTextbook] = useState<Textbook>("人教版");
  const [grade, setGrade] = useState<Grade>("三年级");
  const [subject, setSubject] = useState<Subject>("数学");
  const [lesson, setLesson] = useState("分数的初步认识");
  const [volume, setVolume] = useState<(typeof VOLUME_OPTIONS)[number]>("上册");
  const [period, setPeriod] = useState<number | null>(null);
  const [totalPeriods, setTotalPeriods] = useState(2);
  const [minutes, setMinutes] = useState<35 | 40>(40);
  const [courseType, setCourseType] = useState<PptCourseType>("new");
  const [level, setLevel] = useState<(typeof PPT_LEVEL_OPTIONS)[number]>("基础一般");
  const [aids, setAids] = useState<string[]>(["纸", "彩笔"]);
  const [periodError, setPeriodError] = useState(false);
  const [deck, setDeck] = useState<PptDeck | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const deckRef = useRef<HTMLDivElement>(null);

  const pickTextbook = (value: Textbook) => {
    setTextbook(value);
    setDeck(null);
  };

  const pickGrade = (value: Grade) => {
    setGrade(value);
    setDeck(null);
  };

  const pickSubject = (value: Subject) => {
    setSubject(value);
    setDeck(null);
  };

  const pickPageValues = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setDeck(null);
  };

  const pickVolume = pickPageValues(setVolume);
  const pickMinutes = pickPageValues(setMinutes);
  const pickCourseType = pickPageValues(setCourseType);
  const pickLevel = pickPageValues(setLevel);

  const pickPeriod = (value: number | null) => {
    setPeriod(value);
    setPeriodError(false);
    setDeck(null);
  };

  const pickTotalPeriods = (value: number) => {
    setTotalPeriods(value);
    setPeriod((prev) => (prev && prev > value ? value : prev));
    setDeck(null);
  };

  const toggleAid = (aid: string) => {
    setAids((prev) => {
      if (prev.includes(aid)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== aid);
      }
      return [...prev, aid];
    });
    setDeck(null);
  };

  const applySuggestion = (item: LessonSuggestion) => {
    setLesson(item.lesson);
    setGrade(item.grade);
    setTextbook(item.textbook);
    setPeriod(null);
    setDeck(null);
  };

  const handleGenerate = async () => {
    if (!lesson.trim() || generating) return;
    if (period === null) {
      setPeriodError(true);
      toast(
        "请先选择第几课时：第 1 课时只讲几分之一，第 2 课时讲几分之几与同分母比较",
        "info",
      );
      return;
    }
    setGenerating(true);
    setGenStep(0);
    for (let index = 0; index < GEN_STEPS.length; index += 1) {
      setGenStep(index);
      await delay(340);
    }
    setGenStep(GEN_STEPS.length);
    await delay(220);
    const meta: LessonMeta = { textbook, grade, subject, lesson: lesson.trim() };
    const brief: PptBrief = {
      volume,
      period,
      totalPeriods,
      minutes,
      courseType,
      level,
      aids,
    };
    const next = generatePptDeck({
      meta,
      author: state.teacher.name,
      school: state.teacher.school,
      brief,
    });
    setDeck(next);
    setGenerating(false);
    const passed = next.checks?.filter((item) => item.ok).length ?? 0;
    const totalChecks = next.checks?.length ?? 0;
    toast(`课件已生成：${next.slides.length} 页 · 自检 ${passed}/${totalChecks} 项通过`);
    window.setTimeout(() => {
      deckRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const suggestions = SUGGESTIONS[subject];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 0px)" }}>
      <PageHeader
        title="课件生成"
        subtitle="只按课题编排，不读取教案"
        right={
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate("/json-courseware")}
          >
            <FileJson size={14} /> JSON 课件
          </button>
        }
      />

      <div className="page" style={{ flex: 1 }}>
        <h1
          className="font-display"
          style={{
            fontSize: "calc(23px * var(--site-type))",
            fontWeight: 700,
            lineHeight: 1.4,
            margin: "14px 0 4px",
          }}
        >
          选一个课题，直接出课件
        </h1>
        <p className="small muted" style={{ margin: "0 0 16px" }}>
          课件按「课时」设计：先定边界，再排核心活动与时间，每页固定字段；教案里的目标、试题与作业不会进入课件。
        </p>

        <div className="form-block">
          <div className="form-block-title">教材版本</div>
          <div className="chip-wrap">
            {TEXTBOOKS.map((book) => (
              <Chip key={book} active={textbook === book} onClick={() => pickTextbook(book)}>
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
            {GRADES.map((item) => (
              <Chip key={item} active={grade === item} onClick={() => pickGrade(item)}>
                {item}
              </Chip>
            ))}
          </div>
          <div className="chip-wrap">
            {SUBJECTS.map((item) => (
              <Chip key={item} active={subject === item} onClick={() => pickSubject(item)}>
                {item}
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
              onChange={(event) => {
                setLesson(event.target.value);
                setDeck(null);
              }}
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
                active={lesson === item.lesson && grade === item.grade}
                onClick={() => applySuggestion(item)}
              >
                {item.lesson}
                <span style={{ opacity: 0.55 }}>{item.grade.replace("年级", "")}</span>
              </Chip>
            ))}
          </div>
        </div>

        <div className="form-block">
          <div className="form-block-title">册次与课时</div>
          <div className="chip-wrap" style={{ marginBottom: 10 }}>
            {VOLUME_OPTIONS.map((item) => (
              <Chip key={item} active={volume === item} onClick={() => pickVolume(item)}>
                {item}
              </Chip>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="tiny muted">第</span>
            <select
              className="input"
              value={period ?? ""}
              onChange={(event) =>
                pickPeriod(event.target.value ? Number(event.target.value) : null)
              }
              style={{ width: 104, padding: "7px 10px" }}
              aria-label="第几课时"
            >
              <option value="">请选择</option>
              {Array.from({ length: totalPeriods }, (_, index) => index + 1).map((item) => (
                <option key={item} value={item}>
                  第 {item} 课时
                </option>
              ))}
            </select>
            <span className="tiny muted">共</span>
            <select
              className="input"
              value={totalPeriods}
              onChange={(event) => pickTotalPeriods(Number(event.target.value))}
              style={{ width: 92, padding: "7px 10px" }}
              aria-label="共几课时"
            >
              {[1, 2, 3, 4].map((item) => (
                <option key={item} value={item}>
                  {item} 课时
                </option>
              ))}
            </select>
          </div>
          <div
            className="field-hint"
            style={{ marginTop: 8, color: periodError ? "var(--danger)" : undefined }}
          >
            必须先选课时：第 1 课时只讲几分之一，第 2 课时讲几分之几和同分母比较，一次只教一小步。
          </div>
        </div>

        <div className="form-block">
          <div className="form-block-title">课时时长</div>
          <div className="chip-wrap">
            {([35, 40] as const).map((item) => (
              <Chip key={item} active={minutes === item} onClick={() => pickMinutes(item)}>
                {item} 分钟
              </Chip>
            ))}
          </div>
          <div className="form-block-title" style={{ marginTop: 14 }}>
            课型
          </div>
          <div className="chip-wrap">
            {(Object.keys(COURSE_TYPE_LABEL) as PptCourseType[]).map((item) => (
              <Chip key={item} active={courseType === item} onClick={() => pickCourseType(item)}>
                {COURSE_TYPE_LABEL[item]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="form-block">
          <div className="form-block-title">学情与教具</div>
          <div className="chip-wrap">
            {PPT_LEVEL_OPTIONS.map((item) => (
              <Chip key={item} small active={level === item} onClick={() => pickLevel(item)}>
                {item}
              </Chip>
            ))}
          </div>
          <div className="field-label" style={{ marginTop: 12 }}>
            <span>可用教具</span>
            <span className="field-hint">可多选</span>
          </div>
          <div className="chip-wrap">
            {PPT_AID_OPTIONS.map((item) => (
              <Chip key={item} small active={aids.includes(item)} onClick={() => toggleAid(item)}>
                {item}
              </Chip>
            ))}
          </div>
          <div className="field-hint" style={{ marginTop: 8 }}>
            教具写进每页活动：折纸、涂色、对比都按现有材料设计。
          </div>
        </div>

        <div className="privacy-note" style={{ marginTop: 12 }}>
          <Presentation size={15} style={{ flex: "none", marginTop: 1 }} aria-hidden="true" />
          <span>
            课题不在精编库中也能生成：引擎会按学科知识结构模板编排课件，无需先备教案。
          </span>
        </div>

        {deck ? (
          <div ref={deckRef} style={{ marginTop: 18 }}>
            <div className="card card-pad" style={{ marginBottom: 12 }}>
              <div className="eyebrow">已生成课件 · {deck.slides.length} 页</div>
              <div style={{ fontWeight: 700, marginTop: 3 }}>《{deck.title}》</div>
              <div className="tiny muted">
                {deck.subtitle} · {deck.author}
              </div>
              {deck.brief && (
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  第 {deck.brief.period}/{deck.brief.totalPeriods} 课时 · {deck.brief.minutes} 分钟 ·{" "}
                  {COURSE_TYPE_LABEL[deck.brief.courseType]} · 学情 {deck.brief.level} · 教具{" "}
                  {deck.brief.aids.join("、")}
                </div>
              )}
              <div className="tiny muted" style={{ marginTop: 4 }}>
                内容只来自课题与课时设定；本次生成不写入教案与资源库。
              </div>
            </div>
            <PptPreview deck={deck} />
            <OerHub defaultKeyword={`${grade}${subject} ${lesson.trim()}`} compact />
          </div>
        ) : (
          <div className="card card-pad" style={{ marginTop: 18 }}>
            <div className="eyebrow">课件结构 · 按课时流程</div>
            <ol className="bullet-list bullet-list--num" style={{ marginTop: 8 }}>
              <li>封面：课题、册次、课时与授课教师</li>
              <li>课时边界：这一课时只教什么、不教什么</li>
              <li>环节时间：导入—探究—练习—小结，加总等于课时</li>
              <li>每页固定字段：学生做什么、教师问什么、得出什么、教师备注、配图建议</li>
              <li>课堂练习：带答案与同桌互评标准</li>
              <li>知识小结与结束页</li>
            </ol>
            <div className="tiny muted" style={{ marginTop: 8 }}>
              目标 {minutes} 分钟 · 第 {period ?? "?"} 课时 · 生成前自动自检课时边界、单页容量与时间加总
            </div>
          </div>
        )}
      </div>

      <div className="sticky-actions no-print">
        <button
          type="button"
          className="btn btn-block"
          disabled={!lesson.trim() || generating}
          onClick={handleGenerate}
        >
          <Sparkles size={16} aria-hidden="true" />
          {deck ? "按当前课题重新生成" : "生成课件"}
        </button>
      </div>

      {generating && (
        <div className="gen-overlay no-print" role="status" aria-live="polite">
          <div className="gen-panel">
            <div className="gen-head">
              <span className="gen-orbit" aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, fontSize: "calc(15px * var(--site-type))" }}>
                  正在按课时设计课件
                </div>
                <div className="tiny muted">
                  {grade}
                  {subject}《{lesson.trim()}》· {textbook}
                </div>
              </div>
            </div>
            <div className="gen-steps">
              {GEN_STEPS.map((label, index) => {
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
              <span style={{ width: `${Math.min(genStep / GEN_STEPS.length, 1) * 100}%` }} />
            </div>
            <div className="tiny muted" style={{ marginTop: 10, textAlign: "center" }}>
              教学设计引擎：课时边界 → 核心活动 → 环节时间 → 每页字段 → 自检
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

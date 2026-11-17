import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  GitFork,
  MapPin,
  MessageSquareWarning,
  Printer,
  Sparkles,
  UserRound,
} from "lucide-react";
import { ChainView } from "@/components/PlanCard";
import { DeckTimeline } from "@/components/DeckTimeline";
import { PptPreview } from "@/components/PptPreview";
import { useToast } from "@/components/Toast";
import {
  Avatar,
  Chip,
  EmptyState,
  FieldLabel,
  PageHeader,
  Sheet,
  Stars,
  StatusBadge,
  Tag,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { stagePageMap } from "@/lib/deckTiming";
import { downloadHtmlCourseware, openHtmlCourseware } from "@/lib/htmlCourseware";
import { avgRating, chainFor, conditionLabels, getPlan } from "@/lib/selectors";
import { navigate } from "@/lib/router";
import { useStore } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/types";

const HW_TABS = [
  { key: "basic", label: "基础 · 人人做" },
  { key: "advanced", label: "提升 · 选做" },
  { key: "extended", label: "拓展 · 挑战" },
] as const;

export function PlanDetailPage({ planId }: { planId: string }) {
  const { state, publishPlan, forkPlan, ratePlan, addFeedback } = useStore();
  const toast = useToast();
  const plan = getPlan(state, planId);

  const [forkOpen, setForkOpen] = useState(false);
  const [forkNote, setForkNote] = useState("");
  const [readapt, setReadapt] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [showQuizAnswers, setShowQuizAnswers] = useState(false);
  const [hwTab, setHwTab] = useState<(typeof HW_TABS)[number]["key"]>("basic");

  const chain = useMemo(() => (plan ? chainFor(state, plan.id) : null), [state, plan]);
  const stagePages = useMemo(
    () => (plan?.ppt ? stagePageMap(plan.ppt, plan.content.process) : []),
    [plan],
  );
  const source =
    plan?.sourcePlanId ? getPlan(state, plan.sourcePlanId) : undefined;
  const feedbacks = state.feedbacks.filter((item) => item.planId === planId);

  if (!plan) {
    return (
      <>
        <PageHeader title="教案包" />
        <div className="page">
          <EmptyState
            icon={<ClipboardCheck size={20} />}
            title="没有找到这份教案"
            desc="它可能被「清空本机数据」清除了。"
            action={
              <button type="button" className="btn btn-sm" onClick={() => navigate("/library")}>
                去全国资源库
              </button>
            }
          />
        </div>
      </>
    );
  }

  const isMine = plan.authorId === state.teacher.id;
  const isReviewer = state.role === "reviewer";
  const totalMinutes = plan.content.process.reduce((sum, stage) => sum + stage.minutes, 0);
  const rating = avgRating(plan);
  const myRating = state.myRatings[plan.id] ?? 0;
  const labels = conditionLabels(plan.conditions);
  const projectionReady = plan.conditions.media === "有白板";

  const handleDownloadHtml = () => {
    try {
      const name = downloadHtmlCourseware(plan);
      toast(`已下载 ${name}`);
    } catch (error) {
      console.error(error);
      toast("HTML 课件生成失败", "error");
    }
  };

  const handleOpenHtml = () => {
    try {
      if (openHtmlCourseware(plan)) {
        toast("已在新窗口打开 HTML 课件");
      } else {
        const name = downloadHtmlCourseware(plan);
        toast(`浏览器拦截了新窗口，已下载 ${name}`);
      }
    } catch (error) {
      console.error(error);
      toast("HTML 课件打开失败", "error");
    }
  };

  const banner =
    plan.status === "certified"
      ? {
          tone: "green" as const,
          icon: <CheckCircle2 size={16} />,
          text: `AI 生成 · 已通过全国认证（${plan.reviewerName ?? "教研员"}，${formatDateTime(plan.reviewedAt ?? plan.updatedAt)}）`,
        }
      : plan.status === "original"
        ? {
            tone: "green" as const,
            icon: <Sparkles size={16} />,
            text: "AI 生成 · 教师原创，已即时公开到全国资源库（无需审批）；教研员可查看",
          }
        : {
            tone: "green" as const,
            icon: <Sparkles size={16} />,
            text: isReviewer
              ? "AI 生成 · 教师私有教案，尚未公开；教研员可查看"
              : "AI 生成 · 私有教案，仅自己与教研员可见；一键公开后进入全国资源库",
          };

  const handleRate = (stars: number) => {
    ratePlan(plan.id, stars);
    toast(`已记录 ${stars} 星评分`);
  };

  const handlePublish = () => {
    publishPlan(plan.id);
    toast("已公开为教师原创，无需审批");
  };

  const handleFork = () => {
    const copy = forkPlan(plan.id, forkNote, readapt);
    if (!copy) return;
    setForkOpen(false);
    setForkNote("");
    toast("已生成改编副本，改编链已记录");
    navigate(`/plan/${copy.id}`);
  };

  const handleFeedback = () => {
    if (!feedbackText.trim()) return;
    addFeedback(plan.id, feedbackText);
    setFeedbackText("");
    setFeedbackOpen(false);
    toast("已提交纠错反馈，将进入评测集");
  };

  const quickForkNotes = [
    "按本校无投影条件调整导入环节",
    "增加复式班分年级任务单",
    "压缩为 30 分钟课时",
    "替换为我校可获得的教具",
  ];

  const primaryAction = () => {
    if (isReviewer) {
      return (
        <button type="button" className="btn" style={{ flex: 1 }} disabled>
          教研员查看模式 · 只读
        </button>
      );
    }
    if (isMine && plan.status === "private") {
      return (
        <button type="button" className="btn" style={{ flex: 1 }} onClick={handlePublish}>
          <Sparkles size={15} aria-hidden="true" />
          一键公开（无需审批）
        </button>
      );
    }
    if (!isMine && plan.status === "private") {
      return (
        <button type="button" className="btn" style={{ flex: 1 }} disabled>
          私有教案，暂不可复用
        </button>
      );
    }
    return (
      <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setForkOpen(true)}>
        <GitFork size={15} aria-hidden="true" />
        {isMine ? "改编生成新版本" : "复用并改编"}
      </button>
    );
  };

  return (
    <>
      <PageHeader
        title="教案包"
        right={
          <button
            type="button"
            className="icon-btn"
            aria-label="打印教案"
            onClick={() => window.print()}
          >
            <Printer size={18} />
          </button>
        }
      />

      <div className="page">
        <div className={`banner ${banner.tone === "green" ? "banner--green" : ""}`}>
          {banner.icon}
          <span style={{ flex: 1 }}>{banner.text}</span>
        </div>

        <article className="plan-sheet" style={{ marginTop: 12 }}>
          <div className="print-only">
            <div style={{ fontSize: 16, fontWeight: 700 }}>乡课 · 教案包</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>
              {plan.province} · {plan.county} · {plan.authorName} ·{" "}
              {plan.lessonType === "review" ? "复习课" : "新授课"} ·{" "}
              {formatDateTime(plan.createdAt)}
            </div>
            <hr />
          </div>

          <div className="plan-meta">
            {plan.meta.textbook} · {plan.meta.grade}
            {plan.meta.subject}
          </div>
          <h1 className="plan-head-title">{plan.meta.lesson}</h1>
          <div className="plan-head-meta">
            <StatusBadge status={plan.status} />
            {plan.lessonType === "review" && <Tag tone="wheat">复习课</Tag>}
            {plan.quiz && <Tag tone="plain">含 {plan.quiz.count} 题</Tag>}
            {plan.ppt && <Tag tone="plain">含 PPT</Tag>}
            <span>{plan.conditions.minutes} 分钟</span>
            <span aria-hidden="true">·</span>
            <span>{plan.content.process.length} 个环节</span>
            {rating > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {rating.toFixed(1)} 星（{plan.ratingCount} 人）
                </span>
              </>
            )}
          </div>

          <div className="chip-wrap" style={{ marginTop: 10 }}>
            {labels.map((label) => (
              <Chip key={label} small static>
                {label}
              </Chip>
            ))}
          </div>

          <div className="plan-region" style={{ marginTop: 10 }}>
            <MapPin size={11} aria-hidden="true" />
            <span>
              {plan.province} · {plan.county}
            </span>
          </div>

          {plan.lessonType === "review" && plan.knowledgeRange && (
            <div className="tiny muted" style={{ marginTop: 6 }}>
              复习知识区间：{plan.knowledgeRange}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginTop: 12,
              fontSize: "calc(11px * var(--site-type))",
              color: "var(--site-muted)",
            }}
          >
            <Avatar name={plan.authorName} />
            <span>
              {plan.authorName}
            </span>
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <UserRound size={11} aria-hidden="true" />
              {source ? "改编者" : "原创作者"}
            </span>
          </div>

          {source && (
            <div
              className="chain-note"
              style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "flex-start" }}
            >
              <GitFork size={12} style={{ marginTop: 3, flex: "none" }} aria-hidden="true" />
              <span>
                改编自 {source.authorName}《{source.meta.lesson}》（{source.province}{source.county}）
                {plan.forkNote ? `：${plan.forkNote}` : "。"}
                <button
                  type="button"
                  className="link-btn"
                  style={{ marginLeft: 4, fontSize: "inherit" }}
                  onClick={() => navigate(`/plan/${source.id}`)}
                >
                  查看原教案 <ArrowRight size={11} aria-hidden="true" />
                </button>
              </span>
            </div>
          )}

          <div className="adapt-box" style={{ marginTop: 14 }}>
            <div className="adapt-box-title">
              <Sparkles size={14} aria-hidden="true" />
              乡村适配 · 这份教案为村小做了什么
            </div>
            <ul className="adapt-list">
              {plan.content.adaptations.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>

          <section className="plan-section">
            <h2 className="plan-section-title">
              <span className="num-mark">01</span>教学目标
            </h2>
            <ul className="bullet-list bullet-list--num">
              {plan.content.objectives.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="plan-section">
            <h2 className="plan-section-title">
              <span className="num-mark">02</span>重点与难点
            </h2>
            <div className="qa-grid">
              <div className="qa-box">
                <div className="qa-label">教学重点</div>
                <ul className="bullet-list" style={{ gap: 5 }}>
                  {plan.content.keyPoints.map((item) => (
                    <li key={item} style={{ fontSize: "calc(12px * var(--site-type))" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="qa-box">
                <div className="qa-label">教学难点</div>
                <ul className="bullet-list" style={{ gap: 5 }}>
                  {plan.content.difficulties.map((item) => (
                    <li key={item} style={{ fontSize: "calc(12px * var(--site-type))" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="plan-section">
            <h2 className="plan-section-title">
              <span className="num-mark">03</span>教学过程
              <span className="tiny muted" style={{ marginLeft: "auto", fontWeight: 400 }}>
                共 {totalMinutes} 分钟
              </span>
            </h2>
            <div className="timeline">
              {plan.content.process.map((stage, index) => (
                <div className="tl-item" key={`${stage.stage}-${stage.minutes}`}>
                  <span className="tl-dot" aria-hidden="true" />
                  <div className="tl-head">
                    <span className="tl-title">{stage.stage}</span>
                    <span className="tl-min num">{stage.minutes} 分钟</span>
                    {stagePages[index]?.label && (
                      <span className="tl-slide-ref">看课件 · {stagePages[index].label}</span>
                    )}
                  </div>
                  <div className="tl-body">
                    <div>
                      <span className="tl-role">教师</span>
                      {stage.teacher}
                    </div>
                    <div>
                      <span className="tl-role">学生</span>
                      {stage.student}
                    </div>
                    {stage.fallback && <div className="tl-fallback">乡村替代：{stage.fallback}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="plan-section">
            <h2 className="plan-section-title">
              <span className="num-mark">04</span>板书设计
            </h2>
            <div className="chalkboard">
              <div className="chalkboard-title">{plan.meta.lesson}</div>
              <ul>
                {plan.content.boardDesign.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="plan-section">
            <h2 className="plan-section-title">
              <span className="num-mark">05</span>分层提问
            </h2>
            <div className="qa-grid">
              <div className="qa-box">
                <div className="qa-label">基础 · 面向全体</div>
                <ol>
                  {plan.content.questions.basic.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
              <div className="qa-box">
                <div className="qa-label">提升 · 指向思考</div>
                <ol>
                  {plan.content.questions.advanced.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section className="plan-section">
            <h2 className="plan-section-title">
              <span className="num-mark">06</span>三层作业
            </h2>
            <div className="tabs" role="tablist" aria-label="作业层级">
              {HW_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={hwTab === tab.key}
                  className={`tab ${hwTab === tab.key ? "tab--active" : ""}`}
                  onClick={() => setHwTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <ul className="bullet-list" style={{ marginTop: 10 }}>
              {plan.content.homework[hwTab].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="plan-section">
            <h2 className="plan-section-title">
              <span className="num-mark">07</span>教具替代 ·{" "}
              {plan.conditions.aids === "无" ? "无教具方案" : "低成本材料"}
            </h2>
            <ul className="bullet-list">
              {plan.content.materialSubstitutes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {plan.quiz && (
            <section className="plan-section">
              <h2 className="plan-section-title">
                <span className="num-mark">题</span>配套试题
                <button
                  type="button"
                  className="section-action"
                  style={{ marginLeft: "auto" }}
                  onClick={() => setShowQuizAnswers((prev) => !prev)}
                >
                  {showQuizAnswers ? "隐藏答案" : "显示答案"}
                </button>
              </h2>
              <div className="quiz-meta">
                <div>
                  {plan.quiz.count} 题 · 难度 {plan.quiz.difficulty} ·{" "}
                  {plan.quiz.types.join(" / ")}
                </div>
                <div className="tiny muted">知识区间：{plan.quiz.knowledgeRange}</div>
              </div>
              <div className="stack" style={{ gap: 9 }}>
                {plan.quiz.questions.map((question) => (
                  <div className="quiz-item" key={question.no}>
                    <div className="quiz-stem">
                      <span className="q-no">{question.no}</span>
                      {question.stem}
                    </div>
                    <div className="quiz-tags">
                      <Tag tone="plain">{question.type}</Tag>
                      <Tag tone="plain">{question.difficulty}</Tag>
                      <Tag tone="plain">{question.knowledge}</Tag>
                    </div>
                    {question.options && (
                      <ul className="quiz-options">
                        {question.options.map((option) => (
                          <li key={option}>{option}</li>
                        ))}
                      </ul>
                    )}
                    {showQuizAnswers && (
                      <div className="quiz-answer">
                        <b>参考答案：</b>
                        {question.answer}
                        <div className="tiny muted" style={{ marginTop: 3 }}>
                          解析：{question.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="tiny muted" style={{ marginTop: 8 }}>
                试题由本地题库生成，含答案与解析；随教案保存并可打印。
              </div>
            </section>
          )}

          <section className="plan-section">
            <h2 className="plan-section-title">
              <span className="num-mark">08</span>课后反思提示
            </h2>
            <ul className="bullet-list bullet-list--num">
              {plan.content.reflectionPrompts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {plan.ppt && (
            <section className="plan-section no-print">
              <h2 className="plan-section-title">
                <span className="num-mark">件</span>课件时间轴与输出
              </h2>
              <div className="courseware-branch">
                <span className={`chip ${projectionReady ? "chip--active" : ""}`}>
                  有投影 · PPT 精简课件
                </span>
                <span className={`chip ${projectionReady ? "" : "chip--active"}`}>
                  无投影 / 低设备 · 单文件 HTML
                </span>
                {plan.conditions.classType === "复式班" && (
                  <span className="chip">复式班 · 双泳道（下一步）</span>
                )}
              </div>
              <DeckTimeline deck={plan.ppt} stages={plan.content.process} />
              <div className="courseware-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={handleDownloadHtml}>
                  <Download size={14} /> 下载 HTML 课件
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleOpenHtml}>
                  <ExternalLink size={14} /> 打开 HTML 课件
                </button>
              </div>
              <PptPreview deck={plan.ppt} />
            </section>
          )}

          {(plan.reviewNote || plan.reviewerName) && (
            <section className="plan-section">
              <h2 className="plan-section-title">
                <span className="num-mark">证</span>全国认证说明
              </h2>
              <div className="review-note">
                {plan.reviewNote ?? "已通过全国认证。"}
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  {plan.reviewerName} · {formatDateTime(plan.reviewedAt ?? plan.updatedAt)}
                </div>
              </div>
            </section>
          )}

          <section className="plan-section">
            <h2 className="plan-section-title">
              <span className="num-mark">链</span>改编链
            </h2>
            {chain ? <ChainView planId={plan.id} /> : null}
          </section>

          <section className="plan-section">
            <h2 className="plan-section-title">
              <span className="num-mark">评</span>这份教案能直接上课吗？
            </h2>
            <div className="rating-row">
              <Stars value={myRating} onRate={handleRate} />
              <span className="tiny muted">
                {rating > 0 ? `平均 ${rating.toFixed(1)} 星 · ${plan.ratingCount} 人评分` : "还没有评分"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageSquareWarning size={13} aria-hidden="true" />
                一键纠错
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
                <Printer size={13} aria-hidden="true" />
                打印教案包
              </button>
              {feedbacks.length > 0 && (
                <Tag tone="plain">已提交 {feedbacks.length} 条纠错</Tag>
              )}
            </div>
          </section>

          <div className="plan-head-meta" style={{ marginTop: 18, paddingTop: 10, borderTop: "1px dashed var(--site-border)" }}>
            <CalendarDays size={11} aria-hidden="true" />
            <span>创建 {formatDateTime(plan.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>更新 {formatDateTime(plan.updatedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{STATUS_LABEL[plan.status]}</span>
          </div>
        </article>

        <div className="site-foot">
          教师生成的教案即时公开为「教师原创」，无需审批；教研员可查看
          <br />
          <span className="demo-note">演示版数据保存在本机；正式版将接入内容安全与图片脱敏</span>
        </div>
      </div>

      <div className="sticky-actions no-print">
        <button type="button" className="btn btn-outline" style={{ flex: "none" }} onClick={() => window.print()}>
          <Printer size={15} aria-hidden="true" />
          打印
        </button>
        {primaryAction()}
      </div>

      <Sheet
        open={forkOpen}
        onClose={() => setForkOpen(false)}
        title="复用并改编"
        footer={
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setForkOpen(false)}>
              取消
            </button>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={handleFork}>
              生成改编副本
            </button>
          </div>
        }
      >
        <div className="card card-pad" style={{ marginBottom: 12 }}>
          <div className="eyebrow">来源教案</div>
          <div style={{ fontWeight: 700, marginTop: 3 }}>
            {plan.meta.grade}
            {plan.meta.subject}《{plan.meta.lesson}》
          </div>
          <div className="tiny muted">
            {plan.authorName} · 已复用 {plan.reuseCount} 次
          </div>
        </div>
        <div className="field">
          <FieldLabel label="改编说明" hint="会显示在改编链上" />
          <textarea
            className="textarea"
            value={forkNote}
            placeholder="例如：按我校无投影条件调整导入，增加复式班任务单。"
            onChange={(event) => setForkNote(event.target.value)}
          />
        </div>
        <div className="chip-wrap" style={{ marginTop: 8 }}>
          {quickForkNotes.map((note) => (
            <Chip key={note} small onClick={() => setForkNote(note)}>
              {note}
            </Chip>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--site-border)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <span style={{ flex: 1 }}>
              <span style={{ fontSize: "calc(12.5px * var(--site-type))", fontWeight: 600 }}>
                按本校默认条件重新适配
              </span>
              <span className="tiny muted" style={{ display: "block", marginTop: 2 }}>
                本校默认条件：{conditionLabels(state.schools.find((s) => s.id === state.teacher.schoolId)?.conditions ?? plan.conditions).slice(0, 3).join(" · ")}
              </span>
            </span>
            <button
              type="button"
              className="switch"
              role="switch"
              aria-checked={readapt}
              aria-label="按本校条件重新适配"
              data-on={readapt}
              onClick={() => setReadapt((prev) => !prev)}
            />
          </label>
        </div>
      </Sheet>

      <Sheet
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title="一键纠错"
        footer={
          <button type="button" className="btn btn-block" onClick={handleFeedback} disabled={!feedbackText.trim()}>
            提交反馈
          </button>
        }
      >
        <p className="small muted" style={{ marginTop: 0 }}>
          发现知识性错误、环节不可操作或替代材料不现实？写下来，反馈会进入教研员评测集。
        </p>
        <div className="field">
          <FieldLabel label="问题描述" />
          <textarea
            className="textarea"
            value={feedbackText}
            placeholder="例如：第 2 环节的苹果切分在班里不易操作，建议改为纸条。"
            onChange={(event) => setFeedbackText(event.target.value)}
          />
        </div>
        <div className="chip-wrap" style={{ marginTop: 8 }}>
          {["知识性错误", "环节时长不合理", "教具替代不现实", "表述不清楚"].map((tag) => (
            <Chip key={tag} small onClick={() => setFeedbackText(tag + "：")}>
              {tag}
            </Chip>
          ))}
        </div>
      </Sheet>
    </>
  );
}
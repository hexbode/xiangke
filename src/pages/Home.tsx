import {
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  Camera,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  PenLine,
  Presentation,
  Repeat2,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { LogoLockup, TerraceArt } from "@/components/brand";
import { SectionHead, StatusBadge } from "@/components/ui";
import { greeting, formatDay, todayLabel } from "@/lib/format";
import {
  avgRating,
  conditionLabels,
  myPlans,
  nationalStats,
  publicPlans,
  teacherPlans,
} from "@/lib/selectors";
import { navigate } from "@/lib/router";
import { useStore } from "@/lib/store";

export function HomePage() {
  const { state } = useStore();
  const published = publicPlans(state);
  const mine = myPlans(state);
  const stats = nationalStats(state);
  const allTeacherPlans = teacherPlans(state);
  const school = state.schools.find((item) => item.id === state.teacher.schoolId);
  const conditions = school?.conditions;
  const minePrivate = mine.filter((plan) => plan.status === "private");
  const isReviewer = state.role === "reviewer";

  const quickItems = isReviewer
    ? [
        { label: "课件", icon: Presentation, onClick: () => navigate("/courseware") },
        {
          label: "教师教案",
          icon: ClipboardCheck,
          badge: allTeacherPlans.length,
          onClick: () => navigate("/review"),
        },
        { label: "全国资源", icon: BookOpen, onClick: () => navigate("/library") },
        { label: "全国统计", icon: BarChart3, onClick: () => navigate("/stats") },
        { label: "我的身份", icon: UserRound, onClick: () => navigate("/me") },
      ]
    : [
        { label: "课件", icon: Presentation, onClick: () => navigate("/courseware") },
        { label: "拍照讲评", icon: Camera, onClick: () => navigate("/scan") },
        { label: "全国资源", icon: BookOpen, onClick: () => navigate("/library") },
        { label: "我的教案", icon: BookMarked, onClick: () => navigate("/me") },
        { label: "全国统计", icon: BarChart3, onClick: () => navigate("/stats") },
      ];

  return (
    <div className="page page--flush" style={{ paddingTop: 0, paddingBottom: 20 }}>
      <section className="home-hero">
        <TerraceArt className="hero-art" />
        <div className="hero-top">
          <LogoLockup variant="cream" />
          <button type="button" className="hero-role" onClick={() => navigate("/me")}>
            {isReviewer ? `教研员 · ${state.reviewerName}` : `教师 · ${state.teacher.name}`}
            <ChevronRight size={12} aria-hidden="true" />
          </button>
        </div>

        <h1 className="hero-greeting">
          {isReviewer
            ? `${state.reviewerName.slice(0, 1)}老师，`
            : `${state.teacher.name.slice(0, 1)}老师，`}
          {greeting()}
          <br />
          <em>{isReviewer ? "教师教案，随时可看。" : "明天那节课，先备好。"}</em>
        </h1>
        <p className="hero-sub">
          {isReviewer
            ? `共 ${allTeacherPlans.length} 份教师教案，无需审批，随时可看。`
            : `${todayLabel()} · ${state.teacher.province}`}
        </p>

        {conditions && (
          <div className="hero-conditions">
            <span className="hero-chip">
              <MapPin size={10} style={{ marginRight: 3, verticalAlign: -1 }} aria-hidden="true" />
              本校默认
            </span>
            {conditionLabels(conditions)
              .slice(0, 4)
              .map((label) => (
                <span className="hero-chip" key={label}>
                  {label}
                </span>
              ))}
          </div>
        )}

        <button
          type="button"
          className="hero-cta"
          onClick={() => navigate(isReviewer ? "/review" : "/prepare")}
        >
          <span>
            <span className="hero-cta-title">
              {isReviewer ? "看看老师们生成的好课" : "给明天备一堂能上的课"}
            </span>
            <span className="hero-cta-desc">
              {isReviewer
                ? allTeacherPlans.length > 0
                  ? "无需审批 · 全平台教师教案可查看"
                  : "还没有教师教案 · 可查看全国认证资源"
                : "选教材、勾条件，生成可打印的教案包 · 约 2 分钟"}
            </span>
          </span>
          <span className="hero-cta-icon">
            {isReviewer ? (
              <ClipboardCheck size={18} aria-hidden="true" />
            ) : (
              <PenLine size={18} aria-hidden="true" />
            )}
          </span>
        </button>
      </section>

      <div className="page" style={{ paddingTop: 16 }}>
        <div
          className="quick-grid"
          style={{ gridTemplateColumns: `repeat(${quickItems.length}, 1fr)` }}
        >
          {quickItems.map((item) => (
            <button
              type="button"
              className="quick-item"
              key={item.label}
              onClick={item.onClick}
              style={{ position: "relative" }}
            >
              <span className="quick-icon">
                <item.icon size={17} aria-hidden="true" />
              </span>
              <span className="quick-label">{item.label}</span>
              {typeof item.badge === "number" && item.badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 7,
                    right: 9,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 999,
                    background: "var(--seal)",
                    color: "#fff",
                    fontSize: 9.5,
                    lineHeight: "16px",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {isReviewer && allTeacherPlans.length > 0 && (
          <button
            type="button"
            className="banner"
            style={{ width: "100%", marginTop: 12, cursor: "pointer", textAlign: "left" }}
            onClick={() => navigate("/review")}
          >
            <ClipboardCheck size={17} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              已有 {allTeacherPlans.length} 份教师教案，无需审批，可直接查看
            </span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        )}

        {!isReviewer && minePrivate.length > 0 && (
          <button
            type="button"
            className="banner"
            style={{ width: "100%", marginTop: 12, cursor: "pointer", textAlign: "left" }}
            onClick={() => navigate(`/plan/${minePrivate[0].id}`)}
          >
            <Sparkles size={17} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              {minePrivate.length} 份私有教案：仅自己与教研员可见，可一键公开
            </span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        )}

        <div className="kpi-strip" style={{ marginTop: 14 }}>
          <div className="kpi-cell">
            <div className="kpi-value num">{stats.total}</div>
            <div className="kpi-label">全国教案</div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-value num">{stats.reuseTotal}</div>
            <div className="kpi-label">累计复用</div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-value num">{stats.provinces}</div>
            <div className="kpi-label">覆盖省份</div>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionHead
            title="全国新资源"
            eyebrow="教师原创 · 全国认证 · 无需审批"
            action="全部"
            onAction={() => navigate("/library")}
          />
        </div>
      </div>

      <div className="rail">
        {published.length === 0 ? (
          <article className="rail-card" style={{ cursor: "default" }}>
            <div className="rail-card-title">还没有全国资源</div>
            <p className="small muted" style={{ margin: "6px 0 10px" }}>
              备完第一节课并公开后，资源会出现在这里。
            </p>
            <button type="button" className="btn btn-sm" onClick={() => navigate("/prepare")}>
              去备课
            </button>
          </article>
        ) : (
          published.slice(0, 5).map((plan) => (
          <article
            className="rail-card"
            key={plan.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/plan/${plan.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter") navigate(`/plan/${plan.id}`);
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <StatusBadge status={plan.status} />
              <span className="tiny muted">{formatDay(plan.updatedAt)}</span>
            </div>
            <div className="rail-card-title">
              {plan.meta.grade}
              {plan.meta.subject}《{plan.meta.lesson}》
            </div>
            <div className="rail-meta">
              <span>{plan.province}</span>
              <span aria-hidden="true">·</span>
              <span>{plan.county}</span>
            </div>
            <div className="rail-meta">
              {plan.reuseCount > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <Repeat2 size={11} aria-hidden="true" /> 复用 {plan.reuseCount}
                </span>
              )}
              {avgRating(plan) > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                  <Star size={11} fill="currentColor" aria-hidden="true" />
                  {avgRating(plan).toFixed(1)}
                </span>
              )}
              {plan.lessonType === "review" && <span className="tag tag--plain">复习课</span>}
              {plan.quiz && <span className="tag tag--plain">含 {plan.quiz.count} 题</span>}
              {plan.ppt && <span className="tag tag--plain">含 PPT</span>}
              {plan.conditions.media === "无设备" && <span className="tag tag--plain">无投影版</span>}
            </div>
          </article>
          ))
        )}
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        <SectionHead title="全国教研" eyebrow="全国教师的教研成果，第一次被看见" />
        <div className="card card-pad">
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div>
              <div className="eyebrow">全国资源复用率</div>
              <div
                className="num"
                style={{
                  fontFamily: '"Songti SC", "STSong", serif',
                  fontSize: "calc(30px * var(--site-type))",
                  fontWeight: 700,
                  color: "var(--site-accent)",
                  lineHeight: 1.2,
                }}
              >
                {stats.reuseRate}%
              </div>
            </div>
            <div className="tiny muted" style={{ textAlign: "right", lineHeight: 1.6 }}>
              教师评分均值 {stats.avg.toFixed(1)} / 5
              <br />
              全国教案 {stats.total} 份 · {stats.provinces} 个省份
            </div>
          </div>
          <div className="tiny muted" style={{ marginTop: 10 }}>
            数据来自本机使用：备课、公开与复用后自动累计。
          </div>
          <button
            type="button"
            className="link-btn"
            style={{ marginTop: 10, fontSize: "calc(12px * var(--site-type))" }}
            onClick={() => navigate("/stats")}
          >
            查看完整全国统计 <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>

        <div className="site-foot">
          乡课 · 教师 AI 备课与全国教研共享
          <br />
          <span className="demo-note">
            演示版：生成由本地规则引擎完成，数据仅保存在本机浏览器
          </span>
        </div>
      </div>
    </div>
  );
}
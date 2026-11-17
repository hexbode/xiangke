import { useState } from "react";
import {
  Award,
  BarChart3,
  Camera,
  ChevronRight,
  ClipboardCheck,
  Info,
  Layers,
  LogOut,
  RotateCcw,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { PlanCard } from "@/components/PlanCard";
import { useToast } from "@/components/Toast";
import {
  Avatar,
  Chip,
  EmptyState,
  PageHeader,
  Sheet,
  Tag,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import { avgRating, myPlans, nationalStats, teacherPlans } from "@/lib/selectors";
import { navigate } from "@/lib/router";
import type { PlanStatus, ScanResult } from "@/lib/types";

type Tab = "plans" | "scans" | "growth";
type Filter = PlanStatus | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "certified", label: "认证" },
  { key: "original", label: "原创" },
  { key: "private", label: "私有" },
];

export function ProfilePage() {
  const { state, logout, resetDemo } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("plans");
  const [filter, setFilter] = useState<Filter>("all");
  const [scanSheet, setScanSheet] = useState<ScanResult | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const mine = myPlans(state);
  const certifiedMine = mine.filter((plan) => plan.status === "certified");
  const publishedMine = mine.filter(
    (plan) => plan.status === "certified" || plan.status === "original",
  );
  const allTeacherPlans = teacherPlans(state);
  const isReviewer = state.role === "reviewer";
  const displayName = isReviewer ? state.reviewerName : state.teacher.name;
  const region = isReviewer
    ? [state.profile?.province, state.profile?.county].filter(Boolean).join(" · ")
    : `${state.teacher.province} · ${state.teacher.county}`;
  const visibleTeacherPlans = isReviewer
    ? allTeacherPlans
    : allTeacherPlans.filter((plan) => plan.authorId === state.teacher.id);
  const stats = nationalStats(state);

  const filtered = mine.filter((plan) => (filter === "all" ? true : plan.status === filter));
  const reuseOfMine = publishedMine.reduce((sum, plan) => sum + plan.reuseCount, 0);
  const myReviews = state.reviews.filter((record) => record.submitter === state.teacher.name);
  const growthPoints = isReviewer ? state.reviews.length * 5 : state.teacher.points;

  return (
    <>
      <PageHeader title="我的" back={false} right={<Avatar name={displayName} />} />

      <div className="page">
        <section className="profile-head">
          <div style={{ display: "flex", gap: 12, alignItems: "center", position: "relative", zIndex: 1 }}>
            <Avatar name={displayName} large />
            <div style={{ minWidth: 0 }}>
              <div className="profile-name">{displayName}</div>
              <div className="profile-sub">
                {isReviewer
                  ? "乡课教研员 · 全平台教研"
                  : `${state.teacher.title} · ${state.teacher.years} 年教龄`}
              </div>
              {region && (
                <div className="tiny muted" style={{ marginTop: 2 }}>
                  {region}
                </div>
              )}
              <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                {(isReviewer ? ["全国教研", "资源认证"] : state.teacher.subjects).map((subject) => (
                  <span className="hero-chip" key={subject}>
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="profile-stats">
            {isReviewer ? (
              <>
                <div className="profile-stat">
                  <b className="num">{allTeacherPlans.length}</b>
                  <span>教师教案</span>
                </div>
                <div className="profile-stat">
                  <b className="num">
                    {new Set(allTeacherPlans.map((plan) => plan.authorId)).size}
                  </b>
                  <span>覆盖教师</span>
                </div>
                <div className="profile-stat">
                  <b className="num">{stats.total}</b>
                  <span>全国资源</span>
                </div>
              </>
            ) : (
              <>
                <div className="profile-stat">
                  <b className="num">{publishedMine.length}</b>
                  <span>公开教案</span>
                </div>
                <div className="profile-stat">
                  <b className="num">{reuseOfMine}</b>
                  <span>被复用</span>
                </div>
                <div className="profile-stat">
                  <b className="num">{state.teacher.points}</b>
                  <span>教研积分</span>
                </div>
              </>
            )}
          </div>
        </section>

        <div className="card card-pad" style={{ marginTop: 12 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>
            <span>{isReviewer ? "教研员身份" : "教师身份"}</span>
            <span className="field-hint">登录时选定</span>
          </div>
          <div style={{ fontWeight: 700 }}>
            {isReviewer ? `教研员 · ${state.reviewerName}` : `教师 · ${state.teacher.name}`}
          </div>
          <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
            {isReviewer
              ? "教研员视角：查看全平台教师教案与全国认证资源，不设审批。"
              : "教师视角：备课、生成即公开、复用改编，并查看自己的成长档案。"}
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>
            如需切换身份，请退出登录后重新选择。
          </div>
        </div>

        <div className="tabs" style={{ marginTop: 16 }} role="tablist" aria-label="我的内容">
          {(
            [
              ["plans", "我的教案"],
              ["scans", "讲评记录"],
              ["growth", "成长档案"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`tab ${tab === key ? "tab--active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "plans" && (
          <div style={{ marginTop: 12 }}>
            {!isReviewer && (
              <div className="filter-row" style={{ marginBottom: 10 }}>
                {FILTERS.map((item) => (
                  <Chip
                    key={item.key}
                    small
                    active={filter === item.key}
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}
                    {item.key !== "all" &&
                      ` ${mine.filter((plan) => plan.status === item.key).length}`}
                  </Chip>
                ))}
              </div>
            )}

            {isReviewer ? (
              <EmptyState
                icon={<Layers size={19} />}
                title="当前是教研员视角"
                desc="教研员账号不展示个人教案；如需教师视角，请退出登录后以教师身份进入。"
                action={
                  <button type="button" className="btn btn-sm" onClick={logout}>
                    退出登录，重新选择身份
                  </button>
                }
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Layers size={19} />}
                title="这里还没有教案"
                desc="生成第一份教案包，或从全国资源库复用一份。"
                action={
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button type="button" className="btn btn-sm" onClick={() => navigate("/prepare")}>
                      去备课
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate("/library")}
                    >
                      逛资源库
                    </button>
                  </div>
                }
              />
            ) : (
              <div className="stack">
                {filtered.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "scans" && (
          <div style={{ marginTop: 12 }}>
            {state.scans.length === 0 ? (
              <EmptyState
                icon={<Camera size={19} />}
                title="还没有讲评记录"
                desc="拍一张作业，生成 10 分钟讲评稿和补救练习。"
                action={
                  <button type="button" className="btn btn-sm" onClick={() => navigate("/scan")}>
                    去拍照讲评
                  </button>
                }
              />
            ) : (
              <div className="stack">
                {state.scans.map((scan) => {
                  const percent = Math.round(((scan.total - scan.wrong) / scan.total) * 100);
                  return (
                    <button
                      type="button"
                      className="plan-card"
                      key={scan.id}
                      style={{ width: "100%", textAlign: "left" }}
                      onClick={() => setScanSheet(scan)}
                    >
                      <div className="plan-card-top">
                        <div>
                          <div className="plan-meta">{formatDateTime(scan.createdAt)}</div>
                          <h3 className="plan-title">{scan.title}</h3>
                        </div>
                        <Tag tone="wheat">{percent}% 正确</Tag>
                      </div>
                      <div className="tiny muted" style={{ marginTop: 6 }}>
                        {scan.total} 题 · 错 {scan.wrong} 题 ·{" "}
                        {scan.distribution.map((item) => item.tag).join("、")}
                      </div>
                      <div className="plan-foot">
                        <span>10 分钟讲评稿 · {scan.exercises.length} 道补救练习</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          查看 <ChevronRight size={12} aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "growth" && (
          <div style={{ marginTop: 12 }} className="stack">
            {isReviewer && (
              <div className="banner banner--green">
                <Sparkles size={15} style={{ flex: "none" }} aria-hidden="true" />
                <span>下方展示教师{state.teacher.name}的成长档案。</span>
              </div>
            )}
            <div className="card card-pad">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div className="eyebrow">教研积分</div>
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
                    {growthPoints}
                  </div>
                </div>
                <Tag tone="plain">距离下一级 {Math.max(0, 500 - growthPoints)} 分</Tag>
              </div>
              <div className="bar-track" style={{ marginTop: 10, height: 7 }}>
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.min(100, (growthPoints / 500) * 100)}%`,
                    background: "var(--site-accent)",
                  }}
                />
              </div>
              <div className="tiny muted" style={{ marginTop: 6 }}>
                全国认证资源 +20 · 被复用 +2/次 · 完成讲评 +5 · 纠错被采纳 +10
              </div>
            </div>

            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-value num">{publishedMine.length}</div>
                <div className="stat-label">公开教案</div>
              </div>
              <div className="stat-card">
                <div className="stat-value num">{reuseOfMine}</div>
                <div className="stat-label">我的教案被复用</div>
              </div>
              <div className="stat-card">
                <div className="stat-value num">{state.scans.length}</div>
                <div className="stat-label">完成拍照讲评</div>
              </div>
              <div className="stat-card">
                <div className="stat-value num">
                  {certifiedMine.length
                    ? (
                        certifiedMine.reduce((sum, plan) => sum + avgRating(plan), 0) / certifiedMine.length
                      ).toFixed(1)
                    : "—"}
                </div>
                <div className="stat-label">认证教案平均评分</div>
              </div>
            </div>

            <div className="card card-pad">
              <div className="section-head">
                <h2 className="section-title">成长徽章</h2>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Tag tone="wheat">
                  <Award size={11} /> 全国贡献者
                </Tag>
                <Tag>
                  <TrendingUp size={11} /> 复用达人
                </Tag>
                <Tag tone="plain">
                  <Sparkles size={11} /> 乡村适配实践者
                </Tag>
              </div>
              <div className="tiny muted" style={{ marginTop: 8 }}>
                徽章根据全国认证数量、被复用次数与讲评记录自动点亮。
              </div>
            </div>

            <div className="card card-pad">
              <div className="section-head">
                <h2 className="section-title">最近成长</h2>
              </div>
              <div className="timeline">
                {mine.slice(0, 4).map((plan) => (
                  <div className="tl-item" key={plan.id}>
                    <span className="tl-dot" aria-hidden="true" />
                    <div className="tl-head">
                      <span className="tl-title">
                        {plan.status === "certified"
                          ? "教案通过全国认证"
                          : plan.status === "original"
                            ? "教案以教师原创公开"
                            : "生成私有教案"}
                      </span>
                      <span className="tl-min">{formatDateTime(plan.updatedAt)}</span>
                    </div>
                    <div className="tl-body">
                      {plan.meta.grade}
                      {plan.meta.subject}《{plan.meta.lesson}》
                      {plan.status === "certified" && ` · 已被复用 ${plan.reuseCount} 次`}
                    </div>
                  </div>
                ))}
                {myReviews.slice(0, 2).map((record) => (
                  <div className="tl-item" key={record.id}>
                    <span className="tl-dot" aria-hidden="true" />
                    <div className="tl-head">
                      <span className="tl-title">全国认证记录</span>
                      <span className="tl-min">{formatDateTime(record.at)}</span>
                    </div>
                    <div className="tl-body">{record.planTitle}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="menu-list" style={{ marginTop: 18 }}>
          <button type="button" className="menu-item" onClick={() => navigate("/review")}>
            <span className="menu-icon">
              <ClipboardCheck size={15} />
            </span>
            <span className="menu-desc">
              教师教案
              <small>
                {visibleTeacherPlans.length} 份
                {isReviewer ? "教师教案可查看" : "我的公开 / 私有教案"}
              </small>
            </span>
            <ChevronRight size={15} className="muted" aria-hidden="true" />
          </button>
          <button type="button" className="menu-item" onClick={() => navigate("/stats")}>
            <span className="menu-icon">
              <BarChart3 size={15} />
            </span>
            <span className="menu-desc">
              全国统计
              <small>覆盖省份、复用率与高频错点</small>
            </span>
            <ChevronRight size={15} className="muted" aria-hidden="true" />
          </button>
          <button type="button" className="menu-item" onClick={() => navigate("/about")}>
            <span className="menu-icon">
              <Info size={15} />
            </span>
            <span className="menu-desc">
              关于乡课
              <small>项目定位、社会价值与合规边界</small>
            </span>
            <ChevronRight size={15} className="muted" aria-hidden="true" />
          </button>
          <button type="button" className="menu-item" onClick={logout}>
            <span className="menu-icon" style={{ color: "var(--seal)" }}>
              <LogOut size={15} />
            </span>
            <span className="menu-desc">
              退出登录
              <small>
                {displayName} · {region}
              </small>
            </span>
            <ChevronRight size={15} className="muted" aria-hidden="true" />
          </button>
          <button type="button" className="menu-item" onClick={() => setResetOpen(true)}>
            <span className="menu-icon" style={{ color: "var(--seal)" }}>
              <RotateCcw size={15} />
            </span>
            <span className="menu-desc">
              清空本机数据
              <small>清除本机教案、讲评与登录信息</small>
            </span>
            <ChevronRight size={15} className="muted" aria-hidden="true" />
          </button>
        </div>

        <div className="site-foot">
          {state.teacher.province} · {state.teacher.county} · 教师端小程序形态
          <br />
          <span className="demo-note">
            <Star size={9} fill="currentColor" aria-hidden="true" /> 数据仅保存在本机浏览器
          </span>
        </div>
      </div>

      <Sheet
        open={scanSheet !== null}
        onClose={() => setScanSheet(null)}
        title="讲评记录"
        footer={
          <button type="button" className="btn btn-block" onClick={() => setScanSheet(null)}>
            关闭
          </button>
        }
      >
        {scanSheet && (
          <>
            <div className="card card-pad" style={{ marginBottom: 12 }}>
              <div className="tiny muted">{formatDateTime(scanSheet.createdAt)}</div>
              <div style={{ fontWeight: 700, marginTop: 3 }}>{scanSheet.title}</div>
              <div className="tiny muted" style={{ marginTop: 3 }}>
                {scanSheet.total} 题 · 错 {scanSheet.wrong} 题 · 正确率{" "}
                {Math.round(((scanSheet.total - scanSheet.wrong) / scanSheet.total) * 100)}%
              </div>
            </div>
            <div className="section-head">
              <h2 className="section-title">10 分钟讲评稿</h2>
            </div>
            {scanSheet.script.map((item) => (
              <div className="script-item" key={item.title}>
                <span className="script-time num">{item.minutes}′</span>
                <div>
                  <div className="script-title">{item.title}</div>
                  <div className="script-detail">{item.detail}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </Sheet>

      <Sheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="清空本机数据"
        footer={
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setResetOpen(false)}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ flex: 1, background: "var(--seal)", color: "#fff", borderColor: "var(--seal)" }}
              onClick={() => {
                resetDemo();
                setResetOpen(false);
                toast("本机数据已清空");
                navigate("/");
              }}
            >
              确认重置
            </button>
          </div>
        }
      >
        <p className="small muted" style={{ marginTop: 0 }}>
          将清除本机保存的教案、讲评、积分与登录信息，回到登录页。此操作不可撤销。
        </p>
      </Sheet>
    </>
  );
}
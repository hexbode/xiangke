import { useMemo } from "react";
import { ArrowRight, Award, BarChart3, MapPin, Repeat2, Star, Users } from "lucide-react";
import { PageHeader, SectionHead } from "@/components/ui";
import { avgRating, nationalStats } from "@/lib/selectors";
import { navigate } from "@/lib/router";
import { useStore } from "@/lib/store";

export function StatsPage() {
  const { state } = useStore();
  const stats = nationalStats(state);
  const coveredCombos = stats.subjectGrade.filter((cell) => cell.count > 0).length;
  const maxCell = Math.max(...stats.subjectGrade.map((cell) => cell.count), 1);
  const maxProvince = Math.max(...stats.provinceCoverage.map((item) => item.plans), 1);

  const hotspots = useMemo(() => {
    const map = new Map<string, number>();
    state.scans.forEach((scan) => {
      scan.distribution.forEach((item) => {
        map.set(item.tag, (map.get(item.tag) ?? 0) + item.count);
      });
    });
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [state.scans]);

  const maxHot = Math.max(...hotspots.map((item) => item.count), 1);

  return (
    <>
      <PageHeader title="全国统计" right={<BarChart3 size={17} className="muted" />} />

      <div className="page">
        <div
          className="card card-pad"
          style={{
            background: "linear-gradient(150deg, #33593f, #223d2b)",
            color: "var(--site-on-accent)",
            borderColor: "transparent",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <div className="about-kicker" style={{ color: "var(--site-on-accent)" }}>
                乡课 · 全国教研看板
              </div>
              <div
                className="font-display"
                style={{ fontSize: "calc(21px * var(--site-type))", fontWeight: 700, marginTop: 5 }}
              >
                全国教师的教研成果
                <br />
                第一次能被看见。
              </div>
            </div>
            <span className="hero-role" style={{ pointerEvents: "none" }}>
              <MapPin size={11} aria-hidden="true" />
              全国试点
            </span>
          </div>
          <div className="profile-stats" style={{ marginTop: 14 }}>
            <div className="profile-stat">
              <b className="num">{stats.total}</b>
              <span>全国教案</span>
            </div>
            <div className="profile-stat">
              <b className="num">{stats.reuseTotal}</b>
              <span>累计复用</span>
            </div>
            <div className="profile-stat">
              <b className="num">{stats.reuseRate}%</b>
              <span>资源复用率</span>
            </div>
          </div>
          <div className="tiny" style={{ marginTop: 8, opacity: 0.68 }}>
            其中全国认证 {stats.certifiedCount} 份 · 教师原创 {stats.originalCount} 份
          </div>
        </div>

        <div className="stat-grid" style={{ marginTop: 12 }}>
          <div className="stat-card">
            <div className="stat-value num">
              {stats.provinces}
              <small>个省份</small>
            </div>
            <div className="stat-label">覆盖省级行政区</div>
          </div>
          <div className="stat-card">
            <div className="stat-value num">
              {stats.schools}
              <small>所</small>
            </div>
            <div className="stat-label">覆盖乡村学校</div>
          </div>
          <div className="stat-card">
            <div className="stat-value num">
              {stats.teachers}
              <small>位</small>
            </div>
            <div className="stat-label">贡献教案的教师</div>
          </div>
          <div className="stat-card">
            <div className="stat-value num">
              {coveredCombos}
              <small>/ {stats.subjects.length * stats.grades.length} 个组合</small>
            </div>
            <div className="stat-label">覆盖学科 × 年级</div>
          </div>
          <div className="stat-card">
            <div className="stat-value num">
              {stats.avg.toFixed(1)}
              <small>星</small>
            </div>
            <div className="stat-label">教案可直接上课评分</div>
          </div>
          <div className="stat-card">
            <div className="stat-value num">{stats.students}</div>
            <div className="stat-label">试点校在册学生</div>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionHead
            title="省份分布"
            eyebrow={`${stats.provinces} 个省份 · ${stats.schools} 所学校`}
          />
          <div className="card card-pad">
            {stats.provinceCoverage.length === 0 && (
              <div className="tiny muted" style={{ padding: "6px 0" }}>
                还没有资源，省份分布会在备课与复用后出现。
              </div>
            )}
            {stats.provinceCoverage.map((item) => (
              <div key={item.province} style={{ padding: "7px 0" }}>
                <div className="bar-row" style={{ gridTemplateColumns: "40px 1fr 28px" }}>
                  <span style={{ fontWeight: 600 }}>{item.province}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{
                        width: `${(item.plans / maxProvince) * 100}%`,
                        background: "var(--site-accent)",
                      }}
                    />
                  </span>
                  <span className="tiny num" style={{ textAlign: "right" }}>
                    {item.plans}
                  </span>
                </div>
                <div className="tiny muted" style={{ marginLeft: 48 }}>
                  复用 {item.reuse} 次 · {item.schools} 所学校
                </div>
              </div>
            ))}
            <div className="tiny muted" style={{ marginTop: 6 }}>
              每份资源仍保留省份与县域来源，便于按地区追溯与校本化改编。
            </div>
          </div>
        </div>

        <div className="card card-pad" style={{ marginTop: 12 }}>
          <div className="field-label">
            <span>讲评与备课记录</span>
            <span className="field-hint">数据来自本机使用</span>
          </div>
          <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
            初始不含演示数据。完成备课、导出课件或拍照讲评后，这里会显示自己的使用记录。
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionHead title="学科 × 年级覆盖" eyebrow="数字 = 教案数 + 复用次数" />
          <div className="card card-pad">
            <div className="heat-wrap">
              <div
                className="heat-grid"
                role="table"
                aria-label="全国学科年级覆盖热力图"
                style={{
                  gridTemplateColumns: `58px repeat(${stats.grades.length}, minmax(34px, 1fr))`,
                  minWidth: 58 + stats.grades.length * 36,
                }}
              >
                <div className="heat-cell heat-cell--head">学科 / 年级</div>
                {stats.grades.map((grade) => (
                  <div className="heat-cell heat-cell--head" key={grade}>
                    {grade.replace("年级", "")}
                  </div>
                ))}
                {stats.subjects.map((subject) => (
                  <RowFragment key={subject} subject={subject} stats={stats} maxCell={maxCell} />
                ))}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                marginTop: 8,
              }}
              className="tiny muted"
            >
              低
              <span
                style={{
                  width: 54,
                  height: 7,
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg, color-mix(in srgb, var(--site-accent) 10%, var(--site-surface)), var(--site-accent))",
                }}
              />
              高
            </div>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionHead title="被复用最多的教案" eyebrow="全国优质资源" />
          <div className="card card-pad">
            {stats.topPlans.length === 0 && (
              <div className="tiny muted" style={{ padding: "6px 0" }}>
                还没有被复用的教案；生成并公开第一份教案后会显示在这里。
              </div>
            )}
            {stats.topPlans.map((plan, index) => (
              <div className="hotspot" key={plan.id}>
                <span className="hotspot-rank">{index + 1}</span>
                <button
                  type="button"
                  className="link-btn"
                  style={{ flex: 1, minWidth: 0, textAlign: "left", display: "block" }}
                  onClick={() => navigate(`/plan/${plan.id}`)}
                >
                  <span style={{ fontWeight: 600, display: "block", lineHeight: 1.5 }}>
                    {plan.meta.grade}
                    {plan.meta.subject}《{plan.meta.lesson}》
                  </span>
                  <span className="tiny muted">
                    {plan.authorName} · {plan.province}
                    {plan.county}
                  </span>
                </button>
                <span
                  className="tiny"
                  style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  <Repeat2 size={11} aria-hidden="true" /> {plan.reuseCount}
                </span>
                <span
                  className="tiny"
                  style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 2 }}
                >
                  <Star size={10} fill="currentColor" aria-hidden="true" />
                  {avgRating(plan).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionHead title="高频错点" eyebrow="来自讲评记录与试点填报" />
          <div className="card card-pad">
            {hotspots.length === 0 && (
              <div className="tiny muted" style={{ padding: "6px 0" }}>
                还没有讲评记录；完成一次拍照讲评后会生成高频错点。
              </div>
            )}
            {hotspots.map((item) => (
              <div key={item.tag} style={{ padding: "7px 0" }}>
                <div className="bar-row" style={{ gridTemplateColumns: "124px 1fr 24px" }}>
                  <span>{item.tag}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{ width: `${(item.count / maxHot) * 100}%` }}
                    />
                  </span>
                  <span className="tiny num" style={{ textAlign: "right" }}>
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-outline btn-block"
              style={{ marginTop: 10 }}
              onClick={() => navigate("/prepare")}
            >
              <Award size={15} aria-hidden="true" />
              围绕高频错点备一节巩固课
            </button>
          </div>
        </div>

        <div className="card card-pad" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={16} style={{ color: "var(--site-accent)" }} aria-hidden="true" />
            <span style={{ fontWeight: 700, fontSize: "calc(13px * var(--site-type))" }}>
              受益学生 {stats.students} 人
            </span>
          </div>
          <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
            按复用教案所覆盖的班级学生数推算。学生不直接使用产品，不增加屏幕时间。
          </div>
          <button
            type="button"
            className="link-btn"
            style={{ marginTop: 8, fontSize: "calc(11.5px * var(--site-type))" }}
            onClick={() => navigate("/about")}
          >
            了解指标口径与项目边界 <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>

        <div className="site-foot">
          演示学校与县域均为虚构，数据为种子数据
          <br />
          正式版指标由数据库统计与试点校填报共同产生
        </div>
      </div>
    </>
  );
}

function RowFragment({
  subject,
  stats,
  maxCell,
}: {
  subject: string;
  stats: ReturnType<typeof nationalStats>;
  maxCell: number;
}) {
  return (
    <>
      <div className="heat-cell heat-cell--row">{subject}</div>
      {stats.grades.map((grade) => {
        const cell = stats.subjectGrade.find(
          (item) => item.subject === subject && item.grade === grade,
        );
        const count = cell?.count ?? 0;
        const intensity = count / maxCell;
        return (
          <div
            className="heat-cell"
            key={`${subject}-${grade}`}
            title={`${subject} ${grade}：${count}`}
            style={{
              background:
                count > 0
                  ? `color-mix(in srgb, var(--site-accent) ${Math.round(10 + intensity * 58)}%, var(--site-surface))`
                  : undefined,
              color: intensity > 0.55 ? "var(--site-on-accent)" : undefined,
              fontWeight: count > 0 ? 600 : 400,
            }}
          >
            {count > 0 ? count : "—"}
          </div>
        );
      })}
    </>
  );
}
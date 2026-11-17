import { ClipboardCheck, LayoutList, Users } from "lucide-react";
import { PlanCard } from "@/components/PlanCard";
import { EmptyState, PageHeader, SectionHead } from "@/components/ui";
import { teacherPlans } from "@/lib/selectors";
import { navigate } from "@/lib/router";
import { useStore } from "@/lib/store";

export function ReviewPage() {
  const { state } = useStore();
  const isReviewer = state.role === "reviewer";
  const allTeacherPlans = teacherPlans(state);
  const visible = isReviewer
    ? allTeacherPlans
    : allTeacherPlans.filter((plan) => plan.authorId === state.teacher.id);

  const teachers = new Set(visible.map((plan) => plan.authorId)).size;
  const schools = new Set(visible.map((plan) => plan.schoolId)).size;

  return (
    <>
      <PageHeader
        title="教师教案"
        subtitle="无需审批 · 教研员可查看"
        right={<ClipboardCheck size={17} className="muted" />}
      />

      <div className="page">
        <div className="kpi-strip">
          <div className="kpi-cell">
            <div className="kpi-value num">{visible.length}</div>
            <div className="kpi-label">教师教案</div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-value num">{teachers}</div>
            <div className="kpi-label">覆盖教师</div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-value num">{schools}</div>
            <div className="kpi-label">覆盖学校</div>
          </div>
        </div>

        {!isReviewer && (
          <div className="banner" style={{ marginTop: 12 }}>
            <Users size={17} style={{ flex: "none" }} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              当前为教师视角，仅显示你的教案。教研员登录后可查看全平台教师教案。
            </span>
          </div>
        )}

        <div className="banner banner--green" style={{ marginTop: 12 }}>
          <ClipboardCheck size={17} style={{ flex: "none" }} aria-hidden="true" />
          <span>
            教师生成的教案即时公开为「教师原创」，<b>无需审批</b>；教研员可随时查看。
            私有教案仅本人与教研员可见。
          </span>
        </div>

        <div className="section-head" style={{ marginTop: 20 }}>
          <div>
            <div className="eyebrow">
              {isReviewer ? "全平台 · 含私有教案" : "我的教案"}
            </div>
            <h2 className="section-title">教师教案</h2>
          </div>
          <span className="tiny muted">{visible.length} 份</span>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<LayoutList size={20} />}
            title="还没有教师教案"
            desc="教师生成教案后会自动出现在这里，无需审批。"
            action={
              <button type="button" className="btn btn-sm" onClick={() => navigate("/prepare")}>
                去生成一份
              </button>
            }
          />
        ) : (
          <div className="stack">
            {visible.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}

        <div className="site-foot">
          教研员在这里只查看，不设通过 / 退回环节
          <br />
          全国认证是平台精选标识，不影响教师教案的即时公开
        </div>
      </div>
    </>
  );
}
import { GitFork, MapPin, Repeat2, Star } from "lucide-react";
import { useStore } from "@/lib/store";
import { avgRating, chainFor, conditionLabels } from "@/lib/selectors";
import { formatDay } from "@/lib/format";
import { navigate } from "@/lib/router";
import { planTitle } from "@/lib/engine";
import type { Plan } from "@/lib/types";
import { Avatar, Chip, StatusBadge } from "./ui";

export function PlanCard({
  plan,
  showSchool = true,
  showStatus = true,
}: {
  plan: Plan;
  showSchool?: boolean;
  showStatus?: boolean;
}) {
  const rating = avgRating(plan);
  const labels = conditionLabels(plan.conditions);
  return (
    <article
      className="plan-card"
      role="button"
      tabIndex={0}
      aria-label={`${planTitle(plan)}，查看教案`}
      onClick={() => navigate(`/plan/${plan.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/plan/${plan.id}`);
        }
      }}
    >
      <div className="plan-card-top">
        <div style={{ minWidth: 0 }}>
          <div className="plan-meta">
            {plan.meta.textbook} · {plan.meta.grade}
            {plan.meta.subject}
          </div>
          <h3 className="plan-title">{plan.meta.lesson}</h3>
        </div>
        {showStatus && <StatusBadge status={plan.status} />}
      </div>

      <div className="chip-wrap" style={{ marginTop: 8 }}>
        {plan.lessonType === "review" && (
          <Chip small static>
            复习课
          </Chip>
        )}
        {plan.quiz && (
          <Chip small static>
            含 {plan.quiz.count} 题
          </Chip>
        )}
        {plan.ppt && (
          <Chip small static>
            含 PPT
          </Chip>
        )}
        {labels.slice(0, 4).map((label) => (
          <Chip key={label} small static>
            {label}
          </Chip>
        ))}
      </div>

      <p className="plan-excerpt">{plan.content.objectives[0]}</p>

      <div className="plan-region">
        <MapPin size={10} aria-hidden="true" />
        <span>
          {plan.province} · {plan.county}
        </span>
      </div>

      <div className="plan-foot">
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <Avatar name={plan.authorName} />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {plan.authorName}
            {showSchool && ` · ${plan.province}${plan.county}`}
          </span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 9, flex: "none" }}>
          {plan.reuseCount > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Repeat2 size={11} aria-hidden="true" />
              {plan.reuseCount}
            </span>
          )}
          {rating > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <Star size={11} fill="currentColor" aria-hidden="true" />
              {rating.toFixed(1)}
            </span>
          )}
          {plan.status === "certified" && (
            <span>{formatDay(plan.reviewedAt ?? plan.createdAt)}认证</span>
          )}
        </span>
      </div>
    </article>
  );
}

export function ChainView({ planId }: { planId: string }) {
  const { state } = useStore();
  const { lineage, forks } = chainFor(state, planId);

  return (
    <div>
      <div className="chain">
        {lineage.map((plan, index) => {
          const isCurrent = plan.id === planId;
          const label = index === 0 ? "原教案" : `第 ${index} 次改编`;
          return (
            <div className="chain-item" key={plan.id}>
              <span className={`chain-node ${isCurrent ? "chain-node--current" : ""}`}>
                {index + 1}
              </span>
              <div className="chain-main">
                <div
                  className="chain-title"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/plan/${plan.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") navigate(`/plan/${plan.id}`);
                  }}
                >
                  {label} · {plan.meta.lesson}
                  {isCurrent && <span className="tag" style={{ marginLeft: 6 }}>当前</span>}
                </div>
                <div className="chain-meta">
                  {plan.authorName} · 复用 {plan.reuseCount} 次
                </div>
                {plan.forkNote && <div className="chain-note">改编说明：{plan.forkNote}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {forks.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px dashed var(--site-border)",
            fontSize: "calc(11px * var(--site-type))",
            color: "var(--site-muted)",
            lineHeight: 1.6,
          }}
        >
          <GitFork size={13} style={{ marginTop: 3, flex: "none" }} aria-hidden="true" />
          <span>
            本教案已有 {forks.length} 个改编副本：
            {forks.map((fork, index) => (
              <span key={fork.id}>
                {index > 0 && "、"}
                <button
                  type="button"
                  className="link-btn"
                  style={{ fontSize: "inherit" }}
                  onClick={() => navigate(`/plan/${fork.id}`)}
                >
                  {fork.authorName}《{fork.meta.lesson}》
                </button>
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
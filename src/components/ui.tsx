import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Star, X } from "lucide-react";
import { goBack } from "@/lib/router";
import type { PlanStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  back = true,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <header className="topbar no-print">
      <span className="topbar-side">
        {back && (
          <button
            type="button"
            className="icon-btn"
            aria-label="返回"
            onClick={() => (onBack ? onBack() : goBack())}
          >
            <ArrowLeft size={20} />
          </button>
        )}
      </span>
      <div className="topbar-title">
        {title}
        {subtitle && (
          <div className="tiny muted" style={{ fontWeight: 400, letterSpacing: 0 }}>
            {subtitle}
          </div>
        )}
      </div>
      <span className="topbar-side">{right}</span>
    </header>
  );
}

export function SectionHead({
  title,
  action,
  onAction,
  eyebrow,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  eyebrow?: string;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className="section-title">{title}</h2>
      </div>
      {action && (
        <button type="button" className="section-action" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

export function Chip({
  children,
  active = false,
  onClick,
  small = false,
  static: isStatic = false,
  title,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  small?: boolean;
  static?: boolean;
  title?: string;
}) {
  const className = [
    "chip",
    active ? "chip--active" : "",
    small ? "chip--small" : "",
    isStatic || !onClick ? "chip--static" : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (isStatic || !onClick) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} aria-pressed={active} title={title}>
      {children}
    </button>
  );
}

export function PageCountPicker({
  value,
  presets,
  min,
  max,
  onChange,
}: {
  value: number;
  presets: readonly number[];
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (raw: string): number | null => {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(max, Math.max(min, parsed));
  };

  const typeValue = (raw: string) => {
    setDraft(raw);
    const next = clamp(raw);
    if (next !== null && next !== value) onChange(next);
  };

  const commit = (raw: string) => {
    const next = clamp(raw);
    if (next === null) {
      setDraft(String(value));
      return;
    }
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <>
      <div className="chip-wrap">
        {presets.map((option) => (
          <Chip key={option} small active={value === option} onClick={() => onChange(option)}>
            {option} 页
          </Chip>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <span className="tiny muted">自定义</span>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={draft}
          onChange={(event) => typeValue(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          style={{ width: 84, padding: "7px 10px", textAlign: "center" }}
          aria-label="自定义课件页数"
        />
        <span className="tiny muted">
          页 · 可填 {min}–{max}
        </span>
      </div>
    </>
  );
}

export function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "wheat" | "danger" | "plain";
}) {
  const cls =
    tone === "wheat" ? "tag tag--wheat" : tone === "danger" ? "tag tag--danger" : tone === "plain" ? "tag tag--plain" : "tag";
  return <span className={cls}>{children}</span>;
}

export function StatusBadge({ status }: { status: PlanStatus }) {
  if (status === "certified") return <span className="seal">全国认证</span>;
  if (status === "original") return <Tag>{STATUS_LABEL[status]}</Tag>;
  return <Tag tone="plain">{STATUS_LABEL[status]}</Tag>;
}

export function Stars({
  value,
  count,
  onRate,
  size = 15,
}: {
  value: number;
  count?: number;
  onRate?: (stars: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <span className="rating-row">
      <span
        className={`stars ${onRate ? "" : "stars--static"}`}
        onMouseLeave={() => setHover(0)}
        role={onRate ? "radiogroup" : undefined}
        aria-label={onRate ? "为教案评分" : `评分 ${value} 分`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= display ? "star-btn--on" : ""}`}
            onMouseEnter={() => onRate && setHover(star)}
            onClick={() => onRate?.(star)}
            aria-label={`${star} 星`}
            aria-checked={onRate ? value === star : undefined}
            role={onRate ? "radio" : undefined}
            tabIndex={onRate ? 0 : -1}
          >
            <Star size={size} fill={star <= display ? "currentColor" : "none"} strokeWidth={1.6} />
          </button>
        ))}
      </span>
      {typeof value === "number" && value > 0 && (
        <span className="tiny muted num">
          {value.toFixed(1)}
          {typeof count === "number" && count > 0 ? ` · ${count} 人评分` : ""}
        </span>
      )}
      {onRate && <span className="tiny muted">点击评分</span>}
    </span>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="sheet-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        {children}
        {footer && <div style={{ marginTop: 16 }}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span className={`avatar ${large ? "avatar--lg" : ""}`} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <div className="empty-title">{title}</div>
      {desc && <div className="empty-desc">{desc}</div>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        padding: "4px 0",
      }}
    >
      <span style={{ flex: 1 }}>
        <span style={{ fontSize: "calc(13px * var(--site-type))", fontWeight: 600 }}>{label}</span>
        {desc && (
          <span
            className="tiny muted"
            style={{ display: "block", marginTop: 2, lineHeight: 1.5 }}
          >
            {desc}
          </span>
        )}
      </span>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-on={checked}
        onClick={() => onChange(!checked)}
      />
    </label>
  );
}

export function FieldLabel({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <div className="field-label">
      <span>{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function StepDots({ current, total = 3 }: { current: number; total?: number }) {
  return (
    <div className="step-dots" aria-label={`第 ${current} 步，共 ${total} 步`}>
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={`step-dot ${index < current ? "step-dot--active" : ""}`}
        />
      ))}
    </div>
  );
}

export function ScoreRing({ percent }: { percent: number }) {
  return (
    <div
      className="score-ring"
      style={{ "--score": Math.max(0, Math.min(100, percent)) } as CSSProperties}
      role="img"
      aria-label={`正确率 ${percent}%`}
    >
      <div style={{ display: "grid", placeItems: "center", position: "relative" }}>
        <span className="score-num num">{percent}%</span>
        <span className="score-label">正确率</span>
      </div>
    </div>
  );
}
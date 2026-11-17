import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  Loader2,
  Presentation,
  X,
} from "lucide-react";
import { exportPptx } from "@/lib/ppt";
import { fetchDiagramAsset, type OerResource } from "@/lib/oer";
import { VISUAL_PLAN_LABELS } from "@/lib/visualPlan";
import type { PptDeck, PptSlide, PptVisualPlan } from "@/lib/types";
import { useToast } from "./Toast";

function VisualPlanPanel({ plan }: { plan: PptVisualPlan }) {
  const [copied, setCopied] = useState(false);
  const content =
    plan.mermaid ||
    plan.python ||
    [plan.promptZh, plan.promptEn].filter(Boolean).join("\n\n") ||
    plan.summary;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <details className="ppt-plan">
      <summary>
        <span>配图方案 · {VISUAL_PLAN_LABELS[plan.type]}</span>
        <button
          type="button"
          className="ppt-plan-copy"
          onClick={(event) => {
            event.preventDefault();
            void copy();
          }}
        >
          {copied ? "已复制" : "复制"}
        </button>
      </summary>
      <div className="ppt-plan-body">
        {plan.mermaid && <pre>{plan.mermaid}</pre>}
        {plan.python && <pre>{plan.python}</pre>}
        {plan.promptZh && (
          <p>
            <strong>中文：</strong>
            {plan.promptZh}
          </p>
        )}
        {plan.promptEn && (
          <p>
            <strong>English:</strong> {plan.promptEn}
          </p>
        )}
        {plan.params?.note && <p>{plan.params.note}</p>}
        <p className="tiny muted">{plan.summary}</p>
      </div>
    </details>
  );
}

function thumbLines(slide: PptSlide): string[] {
  if (slide.bullets.length > 0) return slide.bullets.slice(0, 2);
  return [slide.activity, slide.conclusion]
    .filter((item): item is string => !!item)
    .slice(0, 2);
}

function PlanPreview({ plan }: { plan: PptVisualPlan }) {
  if (plan.type === "mermaid" && plan.mermaidNodes && plan.mermaidNodes.length > 0) {
    const nodes = plan.mermaidNodes;
    const edges = plan.mermaidEdges ?? [];
    const root = nodes[0];
    const children = nodes.slice(1, 4);
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(root.id, { x: 160, y: 30 });
    children.forEach((node, index) => {
      const x =
        children.length === 1
          ? 160
          : 40 + index * (240 / Math.max(1, children.length - 1));
      positions.set(node.id, { x, y: 112 });
    });
    return (
      <svg viewBox="0 0 320 150" role="img" aria-label="树状图预览">
        {edges.map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y + 14}
              x2={to.x}
              y2={to.y - 14}
              stroke="var(--site-accent)"
              strokeWidth={1.2}
            />
          );
        })}
        {[root, ...children].map((node) => {
          const point = positions.get(node.id);
          if (!point) return null;
          return (
            <g key={node.id}>
              <rect
                x={point.x - 46}
                y={point.y - 14}
                width={92}
                height={28}
                rx={8}
                fill="var(--site-surface)"
                stroke="var(--site-accent)"
                strokeWidth={1.2}
              />
              <text
                x={point.x}
                y={point.y + 4}
                textAnchor="middle"
                fontSize={9}
                fill="var(--site-fg)"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }
  if (
    (plan.type === "python-pptx" || plan.type === "ppt-params") &&
    plan.params &&
    plan.params.shapes.length > 0
  ) {
    const { shapes, rows, cols } = plan.params;
    const instances = shapes.flatMap((item) =>
      Array.from({ length: item.count }, () => item),
    ).slice(0, 12);
    const safeRows = Math.max(1, rows);
    const safeCols = Math.max(1, cols);
    const cellW = 300 / safeCols;
    const cellH = 130 / safeRows;
    const size = Math.min(cellW, cellH) * 0.62;
    return (
      <svg viewBox="0 0 320 150" role="img" aria-label="配图形状预览">
        {instances.map((item, index) => {
          const col = index % safeCols;
          const row = Math.floor(index / safeCols);
          const cx = 10 + cellW * (col + 0.5);
          const cy = 10 + cellH * (row + 0.5);
          const fill = `#${item.color}`;
          if (item.type === "circle") {
            return <circle key={index} cx={cx} cy={cy} r={size / 2} fill={fill} stroke="#2E5A3C" />;
          }
          if (item.type === "triangle") {
            return (
              <polygon
                key={index}
                points={`${cx},${cy - size / 2} ${cx + size / 2},${cy + size / 2} ${cx - size / 2},${cy + size / 2}`}
                fill={fill}
                stroke="#2E5A3C"
              />
            );
          }
          return (
            <rect
              key={index}
              x={cx - size / 2}
              y={cy - size / 2}
              width={size}
              height={size}
              rx={4}
              fill={fill}
              stroke="#2E5A3C"
            />
          );
        })}
      </svg>
    );
  }
  return null;
}

function DiagramBlock({ slide, meta }: { slide: PptSlide; meta?: PptDeck["meta"] }) {
  const [asset, setAsset] = useState<OerResource | null>(null);
  const plan = slide.visualPlan;
  const usePlan =
    !!plan &&
    (plan.type === "python-pptx" ||
      plan.type === "ppt-params" ||
      (plan.type === "mermaid" && (plan.mermaidNodes?.length ?? 0) > 0));

  useEffect(() => {
    let active = true;
    setAsset(null);
    if (usePlan || !slide.visualHint) return;
    fetchDiagramAsset({
      subject: meta?.subject,
      lesson: meta?.lesson,
      title: slide.title,
      hint: slide.visualHint,
      grade: meta?.grade,
    }).then((result) => {
      if (active) setAsset(result);
    });
    return () => {
      active = false;
    };
  }, [meta?.subject, meta?.lesson, meta?.grade, slide.title, slide.visualHint, usePlan]);

  return (
    <div className={`ppt-flow-visual-body ${asset || usePlan ? "has-asset" : ""}`}>
      <p>{slide.visualHint}</p>
      {usePlan && plan && (
        <figure className="ppt-flow-figure">
          <PlanPreview plan={plan} />
          <figcaption>{VISUAL_PLAN_LABELS[plan.type]} · 按配图方案绘制</figcaption>
        </figure>
      )}
      {!usePlan && asset && (
        <figure className="ppt-flow-figure">
          <img
            src={asset.thumbnail}
            alt={asset.title}
            title={`${asset.title} · ${asset.source}`}
            loading="lazy"
          />
          <figcaption title={`${asset.title} · ${asset.source}`}>{asset.title}</figcaption>
        </figure>
      )}
    </div>
  );
}

function SlideBody({
  slide,
  compact = false,
  meta,
}: {
  slide: PptSlide;
  compact?: boolean;
  meta?: PptDeck["meta"];
}) {
  if (slide.kind === "cover") {
    return (
      <div className={`ppt-slide ppt-slide--cover ${compact ? "ppt-slide--compact" : ""}`}>
        <span className="ppt-brand">乡课</span>
        <div className="ppt-cover-kicker">{slide.kicker}</div>
        <h3 className="ppt-cover-title">{slide.title}</h3>
        <div className="ppt-cover-bullets">
          {slide.bullets.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        {slide.note && <div className="ppt-cover-note">{slide.note}</div>}
      </div>
    );
  }

  if (slide.kind === "closing") {
    return (
      <div className={`ppt-slide ppt-slide--dark ppt-slide--closing ${compact ? "ppt-slide--compact" : ""}`}>
        <span className="ppt-closing-rule" aria-hidden="true" />
        <h3 className="ppt-closing-title">{slide.title}</h3>
        <div className="ppt-closing-lines">
          {slide.bullets.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    );
  }

  if (slide.kind === "lesson" && slide.activity && slide.bullets.length === 0) {
    return (
      <div className={`ppt-slide ppt-slide--flow ${compact ? "ppt-slide--compact" : ""}`}>
        <span className="ppt-slide-bar" aria-hidden="true" />
        <div className="ppt-slide-kicker">{slide.kicker}</div>
        <h3 className="ppt-slide-title">{slide.title}</h3>
        <div className="ppt-flow-grid">
          <section className="ppt-flow-block ppt-flow-visual ppt-flow-diagram">
            <span className="ppt-flow-label">图解区</span>
            <DiagramBlock slide={slide} meta={meta} />
          </section>
          <div className="ppt-flow-side">
            <section className="ppt-flow-block">
              <span className="ppt-flow-label">做一做</span>
              <p>{slide.activity}</p>
            </section>
            <section className="ppt-flow-block ppt-flow-block--ask">
              <span className="ppt-flow-label">想一想</span>
              <p>{slide.question}</p>
            </section>
          </div>
          <div className="ppt-flow-bottom">
            <section className="ppt-flow-block ppt-flow-block--result">
              <span className="ppt-flow-label">说一说</span>
              <p>{slide.conclusion}</p>
            </section>
            <section className="ppt-flow-block ppt-flow-block--mnemonic">
              <span className="ppt-flow-label">口诀 / 板书</span>
              <p>{slide.mnemonic}</p>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const dark = slide.kind === "summary";
  const shape =
    slide.kind === "scenario" ? "ppt-slide--scenario" : slide.kind === "case" ? "ppt-slide--case" : "";
  return (
    <div
      className={`ppt-slide ${dark ? "ppt-slide--dark ppt-slide--summary" : ""} ${shape} ${
        compact ? "ppt-slide--compact" : ""
      }`}
    >
      <span className="ppt-slide-bar" aria-hidden="true" />
      <div className="ppt-slide-kicker">{slide.kicker}</div>
      <h3 className="ppt-slide-title">{slide.title}</h3>
      <div className="ppt-slide-rule" aria-hidden="true" />
      <ul className="ppt-slide-bullets">
        {slide.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {slide.note && <div className="ppt-slide-note">{slide.note}</div>}
    </div>
  );
}

export function PptPreview({ deck }: { deck: PptDeck }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const total = deck.slides.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") setIndex((prev) => Math.max(0, prev - 1));
      if (event.key === "ArrowRight") setIndex((prev) => Math.min(total - 1, prev + 1));
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, total]);

  const download = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportPptx(deck);
      toast(
        result.source === "server"
          ? `已由 python-pptx 服务导出 ${result.fileName}`
          : `服务未启动，已本地导出 ${result.fileName}`,
      );
    } catch (error) {
      console.error(error);
      toast("PPT 导出失败，请重试", "error");
    } finally {
      setExporting(false);
    }
  };

  const openAt = (value: number) => {
    setIndex(value);
    setOpen(true);
  };

  const deckMeta = deck.meta ?? {
    subject: deck.subtitle.match(/(语文|数学|英语|科学|道德与法治|音乐|美术|体育)/)?.[0] ?? "",
    grade: "",
    lesson: deck.title,
  };

  return (
    <div>
      <div className="ppt-summary">
        <span className="ppt-summary-icon">
          <Presentation size={15} aria-hidden="true" />
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "calc(12.5px * var(--site-type))" }}>
            课件 · {total} 页
          </div>
          <div className="tiny muted">按课时流程编排；导出由服务端 python-pptx 生成</div>
        </div>
      </div>

      {deck.checks && deck.checks.length > 0 && (
        <div className="ppt-checks">
          {deck.checks.map((item) => (
            <span key={item.label} className={`ppt-check ${item.ok ? "" : "ppt-check--bad"}`}>
              {item.ok ? "✓" : "!"} {item.label}
            </span>
          ))}
        </div>
      )}

      <div className="ppt-rail">
        {deck.slides.map((slide, slideIndex) => (
          <button
            type="button"
            className="ppt-thumb"
            key={`${slide.title}-${slideIndex}`}
            onClick={() => openAt(slideIndex)}
            aria-label={`预览第 ${slideIndex + 1} 页：${slide.title}`}
          >
            <span
              className={`ppt-thumb-slide ${
                slide.kind === "cover" || slide.kind === "closing" || slide.kind === "summary"
                  ? "ppt-thumb-slide--dark"
                  : ""
              }`}
            >
              <span className="ppt-thumb-kicker">{slide.kicker}</span>
              <span className="ppt-thumb-title">{slide.title}</span>
              <span className="ppt-thumb-lines">
                {thumbLines(slide).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </span>
            </span>
            <span className="ppt-thumb-no">{slideIndex + 1}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => openAt(0)}>
          <Expand size={13} aria-hidden="true" />
          全屏演示
        </button>
        <button type="button" className="btn btn-sm" onClick={download} disabled={exporting}>
          {exporting ? (
            <Loader2 size={13} className="spin" aria-hidden="true" />
          ) : (
            <Download size={13} aria-hidden="true" />
          )}
          {exporting ? "正在导出…" : "导出 .pptx"}
        </button>
      </div>

      {open &&
        createPortal(
          <div className="ppt-overlay" role="dialog" aria-modal="true" aria-label="PPT 演示">
            <div className="ppt-overlay-top">
              <span>
                课件 · {deck.title} · {deck.subtitle}
              </span>
              <button type="button" className="ppt-close" onClick={() => setOpen(false)} aria-label="关闭演示">
                <X size={20} />
              </button>
            </div>
            <div className="ppt-stage">
              <SlideBody slide={deck.slides[index]} meta={deckMeta} />
            </div>
            {deck.slides[index].teacherNote && (
              <div className="ppt-speaker-note">
                <span>教师备注（不投屏）</span>
                <p>{deck.slides[index].teacherNote}</p>
              </div>
            )}
            {deck.slides[index].visualPlan && (
              <VisualPlanPanel plan={deck.slides[index].visualPlan!} />
            )}
            <div className="ppt-controls">
              <button
                type="button"
                className="ppt-ctrl"
                onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
                disabled={index === 0}
                aria-label="上一页"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="ppt-count">
                {index + 1} / {total}
              </span>
              <button
                type="button"
                className="ppt-ctrl"
                onClick={() => setIndex((prev) => Math.min(total - 1, prev + 1))}
                disabled={index === total - 1}
                aria-label="下一页"
              >
                <ChevronRight size={18} />
              </button>
              <button type="button" className="ppt-ctrl" onClick={download} disabled={exporting}>
                {exporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                导出
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
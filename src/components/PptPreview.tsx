import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Download, Expand, Loader2, Presentation, X } from "lucide-react";
import { exportHtmlDeck, fetchDeckHtml } from "@/lib/ppt";
import type { PptDeck } from "@/lib/types";
import { useToast } from "./Toast";

const CENTER: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  color: "rgba(251,248,238,.72)",
  fontSize: "calc(12px * var(--site-type))",
  padding: 20,
  textAlign: "center",
};

export function PptPreview({ deck }: { deck: PptDeck }) {
  const toast = useToast();
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const total = deck.slides.length;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setHtml("");
    fetchDeckHtml(deck)
      .then((page) => {
        if (!alive) return;
        setHtml(page);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        const message = reason instanceof Error ? reason.message : "预览生成失败";
        setError(message === "html_template_missing" ? "未找到网页演示模板" : message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [deck, reloadKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const download = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportHtmlDeck(deck);
      toast(`已导出网页演示 ${result.fileName}`);
    } catch (reason) {
      console.error(reason);
      toast("导出失败，请重试", "error");
    } finally {
      setExporting(false);
    }
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
          <div className="tiny muted">网页演示预览；点击画面后用 ← → 翻页</div>
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

      <div
        style={{
          position: "relative",
          marginTop: 10,
          aspectRatio: "16 / 9",
          minHeight: 220,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--line)",
          background: "#12201a",
        }}
      >
        {loading && (
          <div style={CENTER}>
            <Loader2 size={18} className="spin" aria-hidden="true" />
            <span>正在生成网页演示…</span>
          </div>
        )}
        {!loading && error && (
          <div style={CENTER}>
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              重试
            </button>
          </div>
        )}
        {!loading && !error && html && (
          <iframe
            title="课件网页演示"
            srcDoc={html}
            onLoad={(event) => event.currentTarget.contentWindow?.focus()}
            style={{ width: "100%", height: "100%", border: 0, background: "#f7f2e6" }}
          />
        )}
      </div>

      <div className="tiny muted" style={{ marginTop: 8 }}>
        预览与导出的 HTML 完全一致；预览内按 P 进入演讲者视图，ESC 打开总览。
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setOpen(true)}
          disabled={!html}
        >
          <Expand size={13} aria-hidden="true" />
          全屏演示
        </button>
        <button type="button" className="btn btn-sm" onClick={download} disabled={exporting}>
          {exporting ? (
            <Loader2 size={13} className="spin" aria-hidden="true" />
          ) : (
            <Download size={13} aria-hidden="true" />
          )}
          {exporting ? "正在导出…" : "导出网页演示"}
        </button>
      </div>

      {open &&
        createPortal(
          <div className="ppt-overlay" role="dialog" aria-modal="true" aria-label="课件演示">
            <div className="ppt-overlay-top">
              <span>
                课件 · {deck.title} · {deck.subtitle}
              </span>
              <button
                type="button"
                className="ppt-close"
                onClick={() => setOpen(false)}
                aria-label="关闭演示"
              >
                <X size={20} />
              </button>
            </div>
            <div
              className="ppt-stage"
              style={{ width: "min(100%, 1200px, calc(80vh * 16 / 9))" }}
            >
              <iframe
                title="课件全屏演示"
                srcDoc={html}
                onLoad={(event) => event.currentTarget.contentWindow?.focus()}
                style={{ width: "100%", height: "100%", border: 0, background: "#f7f2e6" }}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

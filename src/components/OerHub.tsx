import { useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon, Link2, Loader2, Search, X } from "lucide-react";
import { OER_SOURCES, fetchHotOer, searchOer } from "@/lib/oer";
import type { OerResource } from "@/lib/oer";

export function OerHub({
  defaultKeyword = "",
  compact = false,
}: {
  defaultKeyword?: string;
  compact?: boolean;
}) {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [results, setResults] = useState<OerResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [searched, setSearched] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [preview, setPreview] = useState<OerResource | null>(null);

  useEffect(() => {
    setKeyword(defaultKeyword);
  }, [defaultKeyword]);

  useEffect(() => {
    let alive = true;
    void fetchHotOer(8).then((data) => {
      if (!alive) return;
      setResults(data.results);
      setFallback(data.fallback);
      setSearched(true);
      setElapsed(data.elapsedMs ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const query = keyword.trim();

  const runSearch = async () => {
    if (loading) return;
    setLoading(true);
    const data = await searchOer(query || defaultKeyword);
    setResults(data.results);
    setFallback(data.fallback);
    setElapsed(data.elapsedMs ?? null);
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="card card-pad" style={{ marginTop: compact ? 12 : 18 }}>
      <div className="section-head" style={{ marginBottom: 8 }}>
        <div>
          <div className="eyebrow">外部资源</div>
          <h2 className="section-title">开放资源接入</h2>
        </div>
        <span className="tiny muted">免登录 · 新窗口打开</span>
      </div>

      {!compact && (
        <p className="tiny muted" style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
          站内检索聚合 Wikimedia Commons、Openverse、Internet Archive 的开放许可内容；
          外部图库不可达时自动展示内置图示。引用请标注作者与许可。
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Search size={15} className="muted" aria-hidden="true" />
        <input
          className="input"
          value={keyword}
          placeholder="输入课题或关键词，例如：分数的初步认识"
          aria-label="外部资源关键词"
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void runSearch();
          }}
        />
        <button
          type="button"
          className="btn btn-sm"
          style={{ flex: "none" }}
          onClick={() => void runSearch()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={13} className="spin" aria-hidden="true" />
          ) : (
            <ImageIcon size={13} aria-hidden="true" />
          )}
          {loading ? "检索中" : "站内检索"}
        </button>
      </div>

      <div className="oer-grid">
        {OER_SOURCES.map((source) => {
          const href = source.search && query ? source.search(query) : source.url;
          return (
            <a
              className="oer-card"
              key={source.id}
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="oer-tag">{source.tag}</span>
              <span className="oer-name">
                {source.name}
                <ExternalLink size={11} aria-hidden="true" />
              </span>
              <span className="oer-desc">{source.desc}</span>
              {source.search && (
                <span className="oer-query">
                  <Link2 size={10} aria-hidden="true" />
                  {query ? `检索「${query}」` : "未填关键词，进入平台首页"}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {searched && (
        <div style={{ marginTop: 14 }}>
          <div className="tiny muted">
            {fallback
              ? "外部图库暂不可达，已展示内置图示模板，可直接用于课件。"
              : `已预取资源 · ${results.length} 条${
                  elapsed != null ? ` · 本地检索 ${elapsed} ms` : ""
                } · 点击可预览，引用请标注作者与许可。`}
          </div>
          <div className="oer-result-grid">
            {results.map((item) => (
              <button
                type="button"
                className="oer-result"
                key={item.id}
                onClick={() => setPreview(item)}
              >
                <img src={item.thumbnail} alt={item.title} loading="lazy" />
                <span className="oer-result-title">{item.title}</span>
                <span className="oer-result-meta">
                  {item.source} · {item.license}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <div
          className="oer-preview"
          role="dialog"
          aria-modal="true"
          aria-label={preview.title}
          onClick={() => setPreview(null)}
        >
          <div className="oer-preview-panel" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="oer-preview-close"
              onClick={() => setPreview(null)}
              aria-label="关闭预览"
            >
              <X size={18} />
            </button>
            <img src={preview.url || preview.thumbnail} alt={preview.title} />
            <div className="oer-preview-title">{preview.title}</div>
            <div className="tiny muted">
              {preview.source} · {preview.license}
              {preview.creator ? ` · ${preview.creator}` : ""}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <a
                className="btn btn-sm"
                href={preview.url}
                target="_blank"
                rel="noreferrer"
              >
                打开原图 / 原页
              </a>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(
                    `${preview.title} · ${preview.source} · ${preview.license} · ${preview.url}`,
                  );
                }}
              >
                复制引用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import katex from "katex";
import "katex/dist/katex.min.css";
import type { JsonCourseSlide, JsonGraphData } from "@/lib/courseJson";

const DOT_LIMIT = 24;

export function DotMatrix({ graph }: { graph: JsonGraphData }) {
  const red = Math.min(DOT_LIMIT, Math.max(0, graph.red ?? 0));
  const green = Math.min(DOT_LIMIT, Math.max(0, graph.green ?? 0));
  return (
    <div className="json-dot-matrix" aria-label={`红色圆点 ${red} 个，绿色圆点 ${green} 个`}>
      {Array.from({ length: red }, (_, index) => (
        <span key={`r-${index}`} className="json-dot json-dot--red" />
      ))}
      {Array.from({ length: green }, (_, index) => (
        <span key={`g-${index}`} className="json-dot json-dot--green" />
      ))}
    </div>
  );
}

export function TreeGraph({ graph }: { graph: JsonGraphData }) {
  const nodes = (graph.nodes ?? []).slice(0, 12);
  if (nodes.length === 0) return null;
  const levels = new Map<string, number>();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depthOf = (id: string, guard = 0): number => {
    if (levels.has(id)) return levels.get(id)!;
    const node = byId.get(id);
    if (!node || !node.parent || guard > 8) {
      levels.set(id, 0);
      return 0;
    }
    const depth = depthOf(node.parent, guard + 1) + 1;
    levels.set(id, depth);
    return depth;
  };
  nodes.forEach((node) => depthOf(node.id));
  const maxDepth = Math.max(1, ...levels.values());
  const groups = new Map<number, typeof nodes>();
  nodes.forEach((node) => {
    const depth = levels.get(node.id) ?? 0;
    groups.set(depth, [...(groups.get(depth) ?? []), node]);
  });
  const positions = new Map<string, { x: number; y: number }>();
  groups.forEach((items, depth) => {
    items.forEach((node, index) => {
      positions.set(node.id, {
        x: 40 + ((index + 0.5) * 240) / items.length,
        y: 24 + (depth * 100) / maxDepth,
      });
    });
  });
  return (
    <svg className="json-tree" viewBox="0 0 320 150" role="img" aria-label="树状图">
      {nodes.map((node) => {
        const parent = node.parent ? positions.get(node.parent) : null;
        const point = positions.get(node.id);
        if (!parent || !point) return null;
        return (
          <line
            key={`${node.id}-edge`}
            x1={parent.x}
            y1={parent.y + 12}
            x2={point.x}
            y2={point.y - 12}
            stroke="#2E5A3C"
            strokeWidth={1.2}
          />
        );
      })}
      {nodes.map((node) => {
        const point = positions.get(node.id);
        if (!point) return null;
        return (
          <g key={node.id}>
            <rect
              x={point.x - 42}
              y={point.y - 13}
              width={84}
              height={26}
              rx={7}
              fill="#FBF8EE"
              stroke="#2E5A3C"
            />
            <text x={point.x} y={point.y + 4} textAnchor="middle" fontSize={9} fill="#22301F">
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Formula({ value }: { value: string }) {
  const html = katex.renderToString(value, {
    throwOnError: false,
    displayMode: true,
    strict: false,
  });
  return <div className="json-formula" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function JsonSlideRenderer({ slide }: { slide: JsonCourseSlide }) {
  return (
    <article className={`json-slide json-slide--${slide.type}`}>
      <header className="json-slide-head">
        <h2>{slide.title}</h2>
        {slide.subtitle && <p>{slide.subtitle}</p>}
      </header>
      {slide.content && slide.content.length > 0 && (
        <div className="json-slide-copy">
          {slide.content.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      {slide.graphData && (
        <div className="json-slide-graph">
          {slide.graphData.type === "dot_matrix" ? (
            <DotMatrix graph={slide.graphData} />
          ) : (
            <TreeGraph graph={slide.graphData} />
          )}
        </div>
      )}
      {slide.formulas && slide.formulas.length > 0 && (
        <div className="json-slide-formulas">
          {slide.formulas.map((formula) => (
            <Formula key={formula} value={formula} />
          ))}
        </div>
      )}
    </article>
  );
}

import type { LessonStage, PptDeck } from "@/lib/types";
import { deckTimings, stagePageMap } from "@/lib/deckTiming";

export function DeckTimeline({
  deck,
  stages,
}: {
  deck: PptDeck;
  stages?: LessonStage[];
}) {
  const timings = deckTimings(deck);
  if (timings.length === 0) return null;
  const total = timings[timings.length - 1].end;
  const mapping = stages ? stagePageMap(deck, stages) : [];

  return (
    <div className="deck-timeline">
      <div className="deck-timeline-head">
        <span className="deck-timeline-title">课堂时间轴</span>
        <span className="tiny muted">
          {total} 分钟 · {timings.length} 页看课件 · 页码与教案环节一一对应
        </span>
      </div>
      {stages && stages.length > 0 && (
        <div className="deck-timeline-stages">
          {stages.map((stage, index) => (
            <div
              key={`${stage.stage}-${index}`}
              className="deck-timeline-stage"
              style={{ flexGrow: Math.max(1, stage.minutes) }}
              title={`${stage.stage} · ${stage.minutes} 分钟`}
            >
              <span>{stage.stage}</span>
              <em>{mapping[index]?.label || "—"}</em>
            </div>
          ))}
        </div>
      )}
      <div className="deck-timeline-rail">
        {timings.map((timing) => (
          <div
            key={timing.page}
            className="deck-timeline-node"
            style={{ flexGrow: Math.max(1, timing.minutes) }}
          >
            <span className="deck-timeline-page">第 {timing.page} 页</span>
            <span className="deck-timeline-name">{timing.title}</span>
            <span className="deck-timeline-time num">
              {timing.start}–{timing.end} 分
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

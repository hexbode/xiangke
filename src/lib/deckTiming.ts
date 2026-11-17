import type { LessonStage, PptDeck } from "./types";

export interface DeckTiming {
  page: number;
  start: number;
  end: number;
  minutes: number;
  title: string;
  kicker: string;
}

export interface StagePageRef {
  pages: number[];
  label: string;
}

export function deckTimings(deck: PptDeck): DeckTiming[] {
  let cursor = 0;
  const timings: DeckTiming[] = [];
  deck.slides.forEach((slide, index) => {
    if (slide.kind !== "lesson" || !slide.activity) return;
    if ((slide.kicker ?? "").includes("答对得星")) return;
    const minutes = slide.minutes ?? 0;
    if (minutes <= 0) return;
    timings.push({
      page: index + 1,
      start: cursor,
      end: cursor + minutes,
      minutes,
      title: slide.title,
      kicker: slide.kicker ?? "",
    });
    cursor += minutes;
  });
  return timings;
}

export function formatPages(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return `第 ${sorted[0]} 页`;
  const isRange = sorted.every((page, index) => index === 0 || page === sorted[index - 1] + 1);
  if (isRange) return `第 ${sorted[0]}–${sorted[sorted.length - 1]} 页`;
  return `第 ${sorted.join("、")} 页`;
}

export function stagePageMap(deck: PptDeck, stages: LessonStage[]): StagePageRef[] {
  const timings = deckTimings(deck);
  let stageStart = 0;
  return stages.map((stage) => {
    const stageEnd = stageStart + stage.minutes;
    const pages = timings
      .filter((timing) => timing.start < stageEnd && timing.end > stageStart)
      .map((timing) => timing.page);
    let result = pages;
    if (result.length === 0) {
      const nearest = timings.find((timing) => timing.start >= stageStart);
      if (nearest) result = [nearest.page];
    }
    const label = formatPages(result);
    stageStart = stageEnd;
    return { pages: result, label };
  });
}

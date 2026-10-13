import type { ArticleSummary, HeadlineSize } from "./types";

/**
 * Rough typographic estimates, in grid units. A row is one line of body type
 * and a column is one newspaper column. These only need to be close: they size
 * boxes to their stories, and the renderer fits the exact amount of text.
 */
export const METRICS = {
  /** Body characters per line in one column. */
  charsPerLine: 34,
  charsPerWord: 6.1,
  /** Rows a 3:2 photo needs per column of width. */
  photoRowsPerCol: 8.5,
  /** Visual width of one column measured in rows (column px / line px). */
  colWidthInRows: 12.7,
  /** No leaf is ever shorter than this. */
  minLeafRows: 10,
  /** Kicker, byline, and padding around a story, in rows. */
  chromeRows: 4,
  /** Headline font size per step, in multiples of the body font size. */
  headlineScale: [1.3, 1.6, 2.0, 2.6, 3.3] as const,
  /** Headline line height relative to body line height, per unit of scale. */
  headlineLeading: 0.85,
};

/** Rows of body text the whole article would fill in one column. */
export function textRowsOf(article: ArticleSummary): number {
  const chars = article.wordCount * METRICS.charsPerWord;
  return Math.ceil(chars / METRICS.charsPerLine);
}

/** Rows a headline takes when set `cols` wide at `size`. */
export function headlineRows(title: string, cols: number, size: HeadlineSize): number {
  const scale = METRICS.headlineScale[size - 1];
  const charsPerLine = Math.max(4, (cols * METRICS.charsPerLine) / scale);
  const lines = Math.ceil(title.length / charsPerLine);
  return Math.ceil(lines * scale * METRICS.headlineLeading);
}

/** Rows for a photo `cols` wide: its natural 3:2 height, but never much over two fifths of the box. */
export function photoRows(cols: number, rows: number): number {
  const natural = Math.round(cols * METRICS.photoRowsPerCol);
  return Math.min(natural, Math.floor(rows * 0.45));
}

/** Width over height as the eye sees it, correcting for narrow columns. */
export function visualAspect(cols: number, rows: number): number {
  return (cols * METRICS.colWidthInRows) / rows;
}

/**
 * How much page area (columns x rows) an article wants: `min` to be worth
 * setting at all, `nice` for a comfortable showing, `max` before its text
 * would run out and leave blank paper.
 */
export interface AreaWish {
  min: number;
  nice: number;
  max: number;
}

const HEAD_AREA = 8;
const MIN_TEXT_ROWS = 10;
const NICE_TEXT_ROWS = 40;
const PHOTO_AREA = { min: 9, nice: 22, max: 60 };

export function areaWish(article: ArticleSummary): AreaWish {
  const text = textRowsOf(article);
  const photo = article.imageUrl ? PHOTO_AREA : { min: 0, nice: 0, max: 0 };
  return {
    min: HEAD_AREA + Math.min(text, MIN_TEXT_ROWS) + photo.min,
    nice: HEAD_AREA + Math.min(text, NICE_TEXT_ROWS) + photo.nice,
    max: HEAD_AREA + text + photo.max,
  };
}

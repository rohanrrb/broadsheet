import {
  headlineRows,
  METRICS,
  photoRows,
  textRowsOf,
} from "./metrics";
import type { ArticleSummary, HeadlineSize, Module, ModuleKind, Rect } from "./types";

/**
 * Cover geometry. The cover box holds a banner band (kicker and headline
 * across its full width), then a photo beside a narrow text column, then the
 * caption. A cover without a photo has the banner and then its text across the
 * whole box, only as tall as the text needs. Recipes use `coverRows` to reserve
 * the box; renderers use `coverSideCols` to split it the same way.
 */
export const COVER = {
  bannerRows: 13,
  captionRows: 3,
  /** The most a cover without a photo gives to its text; a short piece takes less. */
  textOnlyRows: 26,
};

export function coverSideCols(cols: number): number {
  return cols >= 6 ? 2 : 1;
}

export function coverRows(article: ArticleSummary, cols: number): number {
  if (!article.imageUrl) return COVER.bannerRows + coverTextRows(article, cols);
  const photoCols = cols - coverSideCols(cols);
  return COVER.bannerRows + coverPhotoRows(photoCols) + COVER.captionRows;
}

/** Rows a text-only cover's dek and byline take above its text. */
const COVER_DEK_ROWS = 3;
/** Share of extra lines a text-only cover allows its text, since its length is an estimate. */
const COVER_TEXT_SPARE = 0.15;

/**
 * Rows under the banner of a cover without a photo: its dek and byline, then
 * the whole piece set across the box, so a short one leaves no blank paper
 * beneath it. A long piece stops at `textOnlyRows` and jumps.
 */
function coverTextRows(article: ArticleSummary, cols: number): number {
  const text = Math.ceil((textRowsOf(article) / cols) * (1 + COVER_TEXT_SPARE));
  return Math.min(COVER.textOnlyRows, COVER_DEK_ROWS + text);
}

function coverPhotoRows(photoCols: number): number {
  return Math.round(photoCols * METRICS.photoRowsPerCol);
}

export function coverModule(article: ArticleSummary, rect: Rect): Module {
  const hasPhoto = Boolean(article.imageUrl);
  const bodyRows = rect.rows - COVER.bannerRows;
  const textCols = hasPhoto ? coverSideCols(rect.cols) : rect.cols;
  return {
    articleId: article.id,
    kind: "cover",
    rect,
    headline: 5,
    imageRows: hasPhoto ? bodyRows - COVER.captionRows : 0,
    // A cover without a photo was given its rows by coverTextRows, which allows the dek and byline COVER_DEK_ROWS.
    textBudget: budget(bodyRows - (hasPhoto ? METRICS.chromeRows : COVER_DEK_ROWS), textCols),
  };
}

/** Rows set aside for a columnist's portrait and name. */
const PORTRAIT_ROWS = 9;

/** Sets a story in its leaf: picks the treatment, headline size, and text budget. */
export function storyModule(article: ArticleSummary, rect: Rect): Module {
  const opinion =
    article.voice === "opinion" && rect.cols <= 2 && rect.rows >= PORTRAIT_ROWS + MIN_TEXT_ROWS * 2;
  const imageRows = opinion ? 0 : photoRowsFor(article, rect);
  const kind = kindOf(article, rect, { opinion, hasPhoto: imageRows > 0 });
  const headline = headlineSize(kind, rect);
  const usedRows =
    METRICS.chromeRows +
    headlineRows(article.title, rect.cols, headline) +
    imageRows +
    (kind === "opinion" ? PORTRAIT_ROWS : 0);
  return {
    articleId: article.id,
    kind,
    rect,
    headline,
    imageRows,
    textBudget: budget(rect.rows - usedRows, rect.cols),
  };
}

/** Lines of text (summed over the box's columns) kept under headline and photo. */
const MIN_TEXT_LINES = 10;
const MIN_TEXT_ROWS = 8;
/** A photo shorter than this reads as a sliver; the box goes without. */
const MIN_PHOTO_ROWS = 5;

/**
 * The photo's rows: its natural height, but only what the headline and a
 * minimum of text leave free. Zero when the article has no photo or no room.
 */
function photoRowsFor(article: ArticleSummary, rect: Rect): number {
  if (!article.imageUrl) return 0;
  const headRows = headlineRows(article.title, rect.cols, headlineSize("lead", rect));
  const textRows = Math.max(3, Math.ceil(MIN_TEXT_LINES / rect.cols));
  const free = rect.rows - METRICS.chromeRows - headRows - textRows;
  const rows = Math.min(photoRows(rect.cols, rect.rows), free);
  return rows >= MIN_PHOTO_ROWS ? rows : 0;
}

/** Boxes up to this area (columns x rows) holding a short piece set it whole, as a brief. */
const BRIEF_MAX_AREA = 24;
const BRIEF_MAX_TEXT_ROWS = 20;

function kindOf(
  article: ArticleSummary,
  rect: Rect,
  { opinion, hasPhoto }: { opinion: boolean; hasPhoto: boolean },
): ModuleKind {
  if (opinion) return "opinion";
  if (hasPhoto) return "lead";
  const small = rect.cols * rect.rows <= BRIEF_MAX_AREA;
  return small && textRowsOf(article) <= BRIEF_MAX_TEXT_ROWS ? "brief" : "standard";
}

/** Base headline size by box width, from one column up to six. */
const SIZE_BY_COLS = [2, 3, 4, 4, 5, 5];

/** Bigger boxes get bigger headlines; tall rails and wide photo leads get a step more. */
function headlineSize(kind: ModuleKind, rect: Rect): HeadlineSize {
  if (kind === "brief") return 1;
  const base = SIZE_BY_COLS[Math.min(rect.cols, SIZE_BY_COLS.length) - 1];
  const tallRail = rect.cols === 1 && rect.rows >= 40 ? 1 : 0;
  const wideLead = kind === "lead" && rect.cols >= 3 && rect.rows >= 30 ? 1 : 0;
  const cramped = rect.rows < 16 || rect.rows < rect.cols * 8 ? 1 : 0;
  return clampSize(base + tallRail + wideLead - cramped);
}

function clampSize(size: number): HeadlineSize {
  return Math.max(1, Math.min(5, size)) as HeadlineSize;
}

function budget(rows: number, cols: number): number {
  return Math.max(0, rows) * cols * METRICS.charsPerLine;
}

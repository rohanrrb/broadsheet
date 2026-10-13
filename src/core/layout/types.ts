/**
 * Plain, serializable data types for the newspaper layout engine.
 * Nothing here knows about React, HTML, or the database.
 */

/** The minimum the layout engine needs to know about a writing. */
export interface ArticleSummary {
  id: string;
  title: string;
  excerpt: string;
  wordCount: number;
  /** ISO-8601 timestamp, managed by broadsheet. */
  createdAt: string;
  imageUrl?: string;
  /** Opinion pieces get the columnist treatment in narrow boxes. */
  voice?: "news" | "opinion";
}

/**
 * A box on the page grid, in whole units: columns across, and rows down where
 * one row is one line of body type.
 */
export interface Rect {
  col: number;
  row: number;
  cols: number;
  rows: number;
}

/** How an article is set inside its box. */
export type ModuleKind =
  /** The front-page story: banner headline, big photo, side column. */
  | "cover"
  /** Headline, photo, then text. */
  | "lead"
  /** Headline and text. */
  | "standard"
  /** Columnist treatment: headline, portrait, name, then text. */
  | "opinion"
  /** A short piece set whole in a small box. */
  | "brief";

/** Headline size from 1 (smallest) to 5; the cover sizes its own. */
export type HeadlineSize = 1 | 2 | 3 | 4 | 5;

/** One article placed in one leaf of the page partition. */
export interface Module {
  articleId: string;
  kind: ModuleKind;
  rect: Rect;
  headline: HeadlineSize;
  /** Rows reserved for the photo; 0 when none is shown. */
  imageRows: number;
  /** Estimated characters of body text that fit; the renderer refines it. */
  textBudget: number;
}

/** The front-page story, with a human-readable explanation of the pick. */
export interface CoverBlock {
  articleId: string;
  reason: string;
}

/**
 * Where the next page picks up. Serializable so it can round-trip through a
 * URL or API response. Assumes the caller passes the same ordered article list
 * on every call for a given feed.
 */
export interface Cursor {
  /** Index of the page this cursor will produce. */
  page: number;
  /** Number of non-cover articles already laid out. */
  offset: number;
  /** The cover article, excluded from all subsequent pages. */
  coverId: string | null;
  /** Recipe of the previous page, so the next page can differ. */
  lastRecipeId: string | null;
}

export interface Page {
  index: number;
  /** Which page recipe framed this page. */
  recipeId: string;
  /** Grid size: every module's rect lies inside columns x rows. */
  columns: number;
  rows: number;
  /** Only the first page carries a cover. */
  cover: CoverBlock | null;
  /** Leaves of the page partition, in reading order; with `inside`, they tile the grid exactly. */
  modules: Module[];
  /** The front page's Inside box (an index to later pages), when reserved. */
  inside: Rect | null;
  /** `null` once every article has been placed. */
  nextCursor: Cursor | null;
}

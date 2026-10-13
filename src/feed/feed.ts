import { generatePage, pinnedCoverStrategy, suitsCover, type CoverStrategy, type Module, type Page, type Rect } from "@/core/layout";
import { getInstanceSettings, type InstanceDb } from "@/core/db";
import { listWritingsBy } from "@/core/writers";
import { listWritings, type Writing } from "@/core/writings";
import { toFeedEntry, type FeedArticle, type FeedEntry } from "./article";
import type { Block } from "./blocks";
import { decodeFeedCursor, encodeFeedCursor, type FeedCursor } from "./cursor";
import { cutToBudget } from "./text";

/** One laid-out feed page with articles resolved, ready to render or serialize. */
export interface FeedView {
  index: number;
  recipeId: string;
  columns: number;
  rows: number;
  /** Why the cover story was picked; only on the first page. */
  coverReason: string | null;
  /** Leaves of the page grid, in reading order. */
  modules: FeedModuleView[];
  /** The front page's Inside box, where `teasers` are set; null elsewhere. */
  inside: Rect | null;
  /** Stories from the next page, advertised in the front page's Inside box. */
  teasers: FeedTeaser[];
  /** Writings in this edition of the feed. */
  totalArticles: number;
  /** Opaque token for `/api/feed?cursor=`; `null` at the end of the feed. */
  nextCursor: string | null;
}

export interface FeedModuleView extends Module {
  article: FeedArticle;
  /** Body text, cut a little past the budget so the renderer can fit it exactly. */
  blocks: Block[];
  /** Words of `blocks` the layout estimates will fit. */
  budgetWords: number;
  /** Whether the article goes on past `blocks`. */
  truncated: boolean;
}

export interface FeedTeaser {
  article: FeedArticle;
  /** 1-based feed page the story appears on. */
  page: number;
}

const BATCH_SIZE = 100;
const TEASER_COUNT = 3;

/** Lays out the first page (no cursor) or the page a cursor points to. */
export function readFeedPage(db: InstanceDb, encodedCursor?: string): FeedView {
  const cursor = encodedCursor ? decodeFeedCursor(encodedCursor) : null;
  return readPage(db, cursor, cursor?.writerId);
}

/**
 * The first page of one writer's pieces, set the way the front page is. Its
 * cursor names the writer, so later pages come from `readFeedPage` like any other.
 */
export function readWriterPage(db: InstanceDb, writerId: number): FeedView {
  return readPage(db, null, writerId);
}

/** Whether anything a writer has in print would make a decent cover for their page. */
export function writerHasCoverPiece(db: InstanceDb, writerId: number): boolean {
  return loadWritingsBy(db, writerId).some((writing) => suitsCover(toFeedEntry(writing).article));
}

function readPage(db: InstanceDb, cursor: FeedCursor | null, writerId?: number): FeedView {
  const all = writerId === undefined ? loadFeedWritings(db) : loadWritingsBy(db, writerId);
  const asOf = cursor?.asOf ?? all[0]?.position ?? 0;
  const writings = all.filter((w) => w.position <= asOf);
  // The editor's choice of cover is for the paper's front page; a writer's page keeps the layout's own.
  const cover = writerId === undefined ? editorsCover(db) : undefined;
  return layOutPage(writings, { asOf, writerId }, cursor && { ...cursor, layout: placeIn(writings, cursor) }, cover);
}

/** How the front page's cover is picked: the editor's choice if there is one in print, else the layout's. */
function editorsCover(db: InstanceDb): CoverStrategy {
  const pinned = getInstanceSettings(db).coverWritingId;
  return pinnedCoverStrategy(pinned === null ? null : String(pinned));
}

/**
 * The layout cursor with its offset counted afresh: the stories, other than
 * the cover, at or above the last one the reader was shown. Stories are always
 * taken in feed order, so this is where they are, whatever has left the feed
 * or moved in it since.
 */
function placeIn(writings: readonly Writing[], cursor: FeedCursor): FeedCursor["layout"] {
  const { after, layout } = cursor;
  if (after === undefined) return layout;
  const shown = writings.filter((w) => String(w.id) !== layout.coverId && w.position >= after);
  return { ...layout, offset: shown.length };
}

/** The feed position of the last story a page set, for the next cursor to count from. */
function lastSetBefore(writings: readonly Writing[], next: FeedCursor["layout"]): number | undefined {
  return writings.filter((w) => String(w.id) !== next.coverId)[next.offset - 1]?.position;
}

function layOutPage(writings: readonly Writing[], feed: Pick<FeedCursor, "asOf" | "writerId">, cursor: FeedCursor | null, coverStrategy?: CoverStrategy): FeedView {
  const entries = writings.map(toFeedEntry);
  const byId = new Map(entries.map((e) => [e.article.id, e]));
  const articles = entries.map((e) => e.article);
  const seed = layoutSeed(feed.asOf);
  const page = generatePage(articles, seed, { cursor: cursor?.layout, inside: !cursor, coverStrategy });
  const nextPage = page.nextCursor && !cursor ? generatePage(articles, seed, { cursor: page.nextCursor }) : null;
  return {
    index: page.index,
    recipeId: page.recipeId,
    columns: page.columns,
    rows: page.rows,
    coverReason: page.cover?.reason ?? null,
    modules: page.modules.map((m) => toModuleView(m, byId.get(m.articleId)!)),
    inside: page.inside,
    teasers: nextPage ? teasersFrom(nextPage, byId) : [],
    totalArticles: articles.length,
    nextCursor:
      page.nextCursor &&
      encodeFeedCursor({ ...feed, layout: page.nextCursor, after: lastSetBefore(writings, page.nextCursor) }),
  };
}

function toModuleView(module: Module, entry: FeedEntry): FeedModuleView {
  const text = cutToBudget(entry.blocks, module.textBudget);
  return { ...module, article: entry.article, ...text };
}

/** Where the layout sets every writing in print, for the editor's desk. */
export interface FeedPlan {
  /** 1-based page each writing lands on, keyed by writing id. */
  pageOf: Map<string, number>;
  coverId: string | null;
  coverReason: string | null;
  pages: number;
}

/**
 * Lays out the whole current edition, page after page, exactly as readers
 * scrolling from the front page get it.
 */
export function readFeedPlan(db: InstanceDb): FeedPlan {
  const writings = loadFeedWritings(db);
  const articles = writings.map((w) => toFeedEntry(w).article);
  const seed = layoutSeed(writings[0]?.position ?? 0);
  const pageOf = new Map<string, number>();
  const front = generatePage(articles, seed, { inside: true, coverStrategy: editorsCover(db) });
  let page: Page | null = front;
  // Every page sets at least one story, so the edition has at most one page per article.
  for (let i = 0; page && i < articles.length; i++) {
    for (const placed of page.modules) pageOf.set(placed.articleId, page.index + 1);
    page = page.nextCursor ? generatePage(articles, seed, { cursor: page.nextCursor }) : null;
  }
  return {
    pageOf,
    coverId: front.cover?.articleId ?? null,
    coverReason: front.cover?.reason ?? null,
    pages: Math.max(0, ...pageOf.values()),
  };
}

/** Illustrated stories first, then the rest, in the next page's reading order. */
function teasersFrom(page: Page, byId: Map<string, FeedEntry>): FeedTeaser[] {
  const articles = page.modules.map((m) => byId.get(m.articleId)!.article);
  const ranked = [...articles.filter((a) => a.imageUrl), ...articles.filter((a) => !a.imageUrl)];
  return ranked.slice(0, TEASER_COUNT).map((article) => ({ article, page: page.index + 1 }));
}

/** Same feed snapshot, same layout: the seed is derived from the snapshot. */
function layoutSeed(asOf: number): string {
  return `broadsheet-feed:${asOf}`;
}

/**
 * Every writing in print, in feed order. Fine for small instances; a large one would
 * need the layout engine to work over a window instead of the whole list.
 */
export function loadFeedWritings(db: InstanceDb): Writing[] {
  const all: Writing[] = [];
  let cursor: string | undefined;
  do {
    const page = listWritings(db, { cursor, limit: BATCH_SIZE });
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return all;
}

/** One writer's pieces in print, in the order the paper's feed sets them. */
function loadWritingsBy(db: InstanceDb, writerId: number): Writing[] {
  return listWritingsBy(db, writerId).sort((a, b) => b.position - a.position);
}

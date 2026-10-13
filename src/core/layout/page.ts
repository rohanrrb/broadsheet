import { defaultCoverStrategy, type CoverStrategy } from "./cover";
import { fillRegions, takeArticles } from "./fill";
import { carveInside } from "./inside";
import { areaWish, METRICS } from "./metrics";
import { coverModule, coverRows } from "./modules";
import { createRandom, type Random, type Seed } from "./random";
import {
  chooseRecipe,
  DEFAULT_RECIPES,
  fallbackRecipe,
  type Frame,
  type PageRecipe,
  type PageSize,
} from "./recipes";
import { areaOf } from "./slice";
import type { ArticleSummary, CoverBlock, Cursor, Module, Page, Rect } from "./types";

export interface PageOptions {
  /** Where to continue from; omit for the first page. */
  cursor?: Cursor | null;
  coverStrategy?: CoverStrategy;
  recipes?: readonly PageRecipe[];
  /** Grid columns across the page. */
  columns?: number;
  /** Page height in rows (lines of body type). */
  rows?: number;
  /** Reserve the front page's Inside box, an index to later pages. */
  inside?: boolean;
}

export const DEFAULT_COLUMNS = 6;
export const DEFAULT_ROWS = 96;

/**
 * Lays out one page of the feed as a partition of a columns x rows grid.
 * Pure and deterministic: the same articles, seed, and cursor always produce
 * the same page. Pass `page.nextCursor` back in to continue the infinite
 * scroll; each page draws from its own seeded stream, so page N does not
 * depend on how earlier pages were generated.
 */
export function generatePage(
  articles: readonly ArticleSummary[],
  seed: Seed,
  options: PageOptions = {},
): Page {
  const strategy = options.coverStrategy ?? defaultCoverStrategy;
  const cover = options.cursor ? null : strategy.select(articles);
  const cursor = options.cursor ?? firstCursor(cover);
  const pool = articles.filter((a) => a.id !== cursor.coverId);
  const remaining = pool.slice(cursor.offset);
  const coverArticle = cover && articles.find((a) => a.id === cover.articleId)!;
  if (!coverArticle && remaining.length === 0) return emptyPage(cursor.page);

  const setup: Setup = {
    remaining,
    cover: coverArticle,
    size: { cols: options.columns ?? DEFAULT_COLUMNS, rows: options.rows ?? DEFAULT_ROWS },
    recipes: options.recipes ?? DEFAULT_RECIPES,
    previousId: cursor.lastRecipeId,
    seed: `${seed}:page:${cursor.page}`,
  };
  const { random, plan, taken } = layOut(setup, Boolean(options.inside && coverArticle));
  const modules: Module[] = [
    ...(coverArticle && plan.frame.cover ? [coverModule(coverArticle, plan.frame.cover)] : []),
    ...fillRegions(plan.frame.regions, taken, random),
  ];

  const offset = cursor.offset + taken.length;
  return {
    index: cursor.page,
    recipeId: plan.recipe.id,
    columns: setup.size.cols,
    rows: plan.rows,
    cover,
    modules,
    inside: plan.frame.inside ?? null,
    nextCursor:
      offset < pool.length
        ? { page: cursor.page + 1, offset, coverId: cursor.coverId, lastRecipeId: plan.recipe.id }
        : null,
  };
}

interface Setup {
  remaining: readonly ArticleSummary[];
  cover: ArticleSummary | null;
  size: PageSize;
  recipes: readonly PageRecipe[];
  previousId: string | null;
  seed: string;
}

/**
 * Plans the page and picks its stories. A page that would set every story
 * left is laid out again without the Inside box: there is nothing later for
 * it to point to. Each attempt draws from a fresh stream of the page's seed.
 */
function layOut(setup: Setup, inside: boolean) {
  const random = createRandom(setup.seed);
  const plan = planPage(setup, random, inside);
  const taken = takeArticles(setup.remaining, plan.frame.regions);
  const exhausts = taken.length === setup.remaining.length;
  if (plan.frame.inside && exhausts) return layOut(setup, false);
  return { random, plan, taken };
}

interface Plan {
  recipe: PageRecipe;
  frame: Frame & { inside?: Rect };
  rows: number;
}

/**
 * Picks the page's recipe and frames it, carving out the Inside box when
 * asked and there is room. When the stories left cannot fill a
 * full page, a single-region recipe frames a shorter page instead, so the last
 * page ends early rather than leaving blank paper.
 */
function planPage(setup: Setup, random: Random, inside: boolean): Plan {
  const { remaining, cover, size, recipes, previousId } = setup;
  const kind = cover ? "front" : "inner";
  const recipe = chooseRecipe(recipes, kind, remaining.length, previousId, random);
  const frame = recipe.frame(size, cover);
  if (!runsShort(remaining, frame)) {
    const carved = inside ? carveInside(frame, remaining.length) : null;
    return { recipe, frame: carved ?? frame, rows: size.rows };
  }

  const fallback = fallbackRecipe(kind, remaining.length);
  const rows = shortPageRows(remaining, cover, size);
  return { recipe: fallback, frame: fallback.frame({ ...size, rows }, cover), rows };
}

/** Whether the stories left would leave paper blank: too few for the frame's regions, or none but the cover. */
function runsShort(remaining: readonly ArticleSummary[], frame: Frame): boolean {
  if (remaining.length === 0) return true;
  const room = frame.regions.reduce((sum, r) => sum + areaOf(r), 0);
  return niceArea(remaining) < room;
}

/** Just enough rows for the cover (if any) and every remaining story. */
function shortPageRows(
  remaining: readonly ArticleSummary[],
  cover: ArticleSummary | null,
  size: PageSize,
): number {
  const coverHeight = cover ? coverRows(cover, size.cols) : 0;
  if (remaining.length === 0) return coverHeight;
  const byArea = Math.ceil(niceArea(remaining) / size.cols);
  const byCount = Math.ceil(remaining.length / size.cols) * METRICS.minLeafRows;
  return Math.min(size.rows, coverHeight + Math.max(byArea, byCount));
}

function niceArea(articles: readonly ArticleSummary[]): number {
  return articles.reduce((sum, a) => sum + areaWish(a).nice, 0);
}

function firstCursor(cover: CoverBlock | null): Cursor {
  return { page: 0, offset: 0, coverId: cover?.articleId ?? null, lastRecipeId: null };
}

function emptyPage(index: number): Page {
  return {
    index,
    recipeId: "empty",
    columns: DEFAULT_COLUMNS,
    rows: 0,
    cover: null,
    modules: [],
    inside: null,
    nextCursor: null,
  };
}

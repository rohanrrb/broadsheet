import { describe, expect, it } from "vitest";
import {
  carveInside,
  COVER,
  DEFAULT_RECIPES,
  DEFAULT_ROWS,
  INSIDE,
  METRICS,
  generatePage,
  sliceRect,
  weightedCoverStrategy,
  type ArticleSummary,
  type CoverStrategy,
  type Page,
  type PageOptions,
  type PageRecipe,
  type Rect,
} from "./index";
import { createRandom } from "./random";

function makeArticles(count: number): ArticleSummary[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `a${i}`,
    title: `Article number ${i} has a headline of middling length`,
    excerpt: "…",
    wordCount: 40 + ((i * 377) % 900),
    createdAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    imageUrl: i % 3 === 0 ? `https://img/${i}.jpg` : undefined,
    voice: i % 7 === 0 ? "opinion" : "news",
  }));
}

function allPages(
  articles: ArticleSummary[],
  seed: string,
  options: Omit<PageOptions, "cursor"> = {},
): Page[] {
  const pages = [generatePage(articles, seed, options)];
  while (pages.at(-1)!.nextCursor) {
    const cursor = pages.at(-1)!.nextCursor;
    pages.push(generatePage(articles, seed, { ...options, cursor }));
  }
  return pages;
}

/** Every leaf of the page: its modules plus the Inside box, if any. */
function leavesOf(page: Page): Rect[] {
  return [...page.modules.map((m) => m.rect), ...(page.inside ? [page.inside] : [])];
}

function placedIds(pages: Page[]): string[] {
  return pages.flatMap((page) => page.modules.map((m) => m.articleId));
}

/** Throws unless the rects cover the grid exactly once, cell by cell. */
function expectExactTiling(rects: Rect[], cols: number, rows: number) {
  const hits = new Array(cols * rows).fill(0);
  for (const r of rects) {
    expect(r.col).toBeGreaterThanOrEqual(0);
    expect(r.row).toBeGreaterThanOrEqual(0);
    expect(r.col + r.cols).toBeLessThanOrEqual(cols);
    expect(r.row + r.rows).toBeLessThanOrEqual(rows);
    for (let c = r.col; c < r.col + r.cols; c++) {
      for (let y = r.row; y < r.row + r.rows; y++) hits[y * cols + c] += 1;
    }
  }
  expect(hits.every((h) => h === 1)).toBe(true);
}

const SEEDS = ["a", "b", "c", "d", "e", "f"];

describe("generatePage", () => {
  const articles = makeArticles(57);

  it("is deterministic for the same inputs and seed", () => {
    expect(allPages(articles, "s1")).toEqual(allPages(articles, "s1"));
  });

  it("varies with the seed", () => {
    const shapes = (seed: string) =>
      allPages(articles, seed).map((p) => p.modules.map((m) => m.rect));
    expect(shapes("s1")).not.toEqual(shapes("s2"));
  });

  it("produces plain serializable data", () => {
    const page = generatePage(articles, "s1");
    expect(JSON.parse(JSON.stringify(page))).toEqual(page);
  });

  it("places every article exactly once across all pages", () => {
    for (const seed of SEEDS) {
      const ids = placedIds(allPages(articles, seed));
      expect(new Set(ids).size).toBe(ids.length);
      expect([...ids].sort()).toEqual(articles.map((a) => a.id).sort());
    }
  });

  it("tiles every page exactly, with no gaps or overlaps", () => {
    for (const count of [1, 2, 3, 5, 9, 23, 57]) {
      for (const seed of SEEDS) {
        for (const page of allPages(makeArticles(count), seed)) {
          expectExactTiling(page.modules.map((m) => m.rect), page.columns, page.rows);
        }
      }
    }
  });

  it("keeps full pages at full height and ends the feed with a shorter page", () => {
    const pages = allPages(articles, "s1");
    pages.slice(0, -1).forEach((page) => expect(page.rows).toBe(96));
    expect(pages.at(-1)!.rows).toBeLessThanOrEqual(96);
  });

  it("sets a dense page: several stories on each full page", () => {
    const pages = allPages(articles, "s1").slice(0, -1);
    pages.forEach((page) => expect(page.modules.length).toBeGreaterThanOrEqual(5));
  });

  it("puts a cover only on the first page", () => {
    const pages = allPages(articles, "s1");
    expect(pages[0].cover).not.toBeNull();
    expect(pages[0].modules.filter((m) => m.kind === "cover")).toHaveLength(1);
    expect(pages.slice(1).every((p) => p.cover === null)).toBe(true);
    expect(pages.slice(1).flatMap((p) => p.modules).some((m) => m.kind === "cover")).toBe(false);
  });

  it("never repeats a recipe on consecutive full pages", () => {
    const pages = allPages(articles, "s1").slice(0, -1);
    pages.slice(1).forEach((page, i) => expect(page.recipeId).not.toBe(pages[i].recipeId));
  });

  it("generates page N from its cursor alone", () => {
    const pages = allPages(articles, "s1");
    const replayed = generatePage(articles, "s1", { cursor: pages[1].nextCursor });
    expect(replayed).toEqual(pages[2]);
  });

  it("shows photos only for illustrated articles, and gives every story a text budget", () => {
    const byId = new Map(articles.map((a) => [a.id, a]));
    for (const m of allPages(articles, "s1").flatMap((p) => p.modules)) {
      if (m.imageRows > 0) expect(byId.get(m.articleId)!.imageUrl).toBeDefined();
      expect(m.textBudget).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles empty and single-article feeds", () => {
    expect(generatePage([], "s")).toMatchObject({ modules: [], cover: null, nextCursor: null });
    const single = generatePage(makeArticles(1), "s");
    expect(single.cover?.articleId).toBe("a0");
    expect(single.modules.map((m) => m.kind)).toEqual(["cover"]);
    expect(single.nextCursor).toBeNull();
  });

  it("ends a page whose cover is its only story at the cover, leaving no blank paper", () => {
    const [article] = makeArticles(1);
    const pictured = generatePage([article], "s");
    expect(pictured.rows).toBeLessThan(DEFAULT_ROWS);
    expect(pictured.modules[0].rect).toMatchObject({ row: 0, rows: pictured.rows });
  });

  it("gives a cover without a photo only the rows its text fills, up to a limit", () => {
    const [article] = makeArticles(1);
    const coverRowsOf = (wordCount: number) =>
      generatePage([{ ...article, imageUrl: undefined, wordCount }], "s").modules[0].rect.rows;
    expect(coverRowsOf(150)).toBeLessThan(coverRowsOf(400));
    expect(coverRowsOf(400)).toBeLessThan(COVER.bannerRows + COVER.textOnlyRows);
    expect(coverRowsOf(5000)).toBe(COVER.bannerRows + COVER.textOnlyRows);
  });

  it("budgets a short cover without a photo for all of its text", () => {
    const [article] = makeArticles(1);
    for (const wordCount of [5, 10, 27, 45, 100, 250]) {
      const [cover] = generatePage([{ ...article, imageUrl: undefined, wordCount }], "s").modules;
      expect(cover.textBudget).toBeGreaterThanOrEqual(wordCount * METRICS.charsPerWord);
    }
  });

  it("accepts custom recipes", () => {
    const leftHalf: PageRecipe = {
      id: "halves",
      page: "inner",
      regions: 2,
      weight: 1,
      frame: ({ cols, rows }) => ({
        cover: null,
        regions: [
          { col: 0, row: 0, cols: cols / 2, rows },
          { col: cols / 2, row: 0, cols: cols / 2, rows },
        ],
      }),
    };
    const recipes = [...DEFAULT_RECIPES.filter((r) => r.page === "front"), leftHalf];
    const pages = allPages(articles, "s", { recipes });
    expect(pages.slice(1, -1).every((p) => p.recipeId === "halves")).toBe(true);
    pages.forEach((p) => expectExactTiling(p.modules.map((m) => m.rect), p.columns, p.rows));
  });
});

describe("Inside box", () => {
  const articles = makeArticles(57);
  const withInside = { inside: true };

  it("is reserved on the front page only, at its fixed size", () => {
    for (const seed of SEEDS) {
      const [front, ...rest] = allPages(articles, seed, withInside);
      expect(front.inside).toMatchObject({ cols: INSIDE.cols, rows: INSIDE.rows });
      expect(rest.every((p) => p.inside === null)).toBe(true);
    }
  });

  it("keeps every page tiled exactly and full height, whatever the recipe", () => {
    for (const count of [1, 2, 3, 5, 9, 23, 57]) {
      for (const seed of SEEDS) {
        const pages = allPages(makeArticles(count), seed, withInside);
        pages.forEach((p) => expectExactTiling(leavesOf(p), p.columns, p.rows));
      }
    }
    for (const recipe of DEFAULT_RECIPES.filter((r) => r.page === "front")) {
      const front = generatePage(articles, "s", { ...withInside, recipes: [recipe] });
      expect(front.inside).not.toBeNull();
      expect(front.rows).toBe(96);
      expectExactTiling(leavesOf(front), front.columns, front.rows);
    }
  });

  it("still places every article exactly once", () => {
    const ids = placedIds(allPages(articles, "s1", withInside));
    expect([...ids].sort()).toEqual(articles.map((a) => a.id).sort());
  });

  it("is dropped when the front page sets every story", () => {
    for (const count of [1, 2, 3, 5]) {
      const pages = allPages(makeArticles(count), "s", withInside);
      pages.filter((p) => !p.nextCursor).forEach((p) => expect(p.inside).toBeNull());
    }
  });

  it("is off unless asked for", () => {
    expect(generatePage(articles, "s1").inside).toBeNull();
  });
});

describe("carveInside", () => {
  it("takes the top of the last rail, leaving the rest of it for stories", () => {
    const frame = {
      cover: null,
      regions: [
        { col: 1, row: 0, cols: 4, rows: 96 },
        { col: 5, row: 0, cols: 1, rows: 96 },
        { col: 0, row: 0, cols: 1, rows: 96 },
      ],
    };
    const carved = carveInside(frame, 10)!;
    expect(carved.inside).toEqual({ col: 0, row: 0, cols: 1, rows: INSIDE.rows });
    expect(carved.regions[2]).toEqual({ col: 0, row: INSIDE.rows, cols: 1, rows: 96 - INSIDE.rows });
  });

  it("splits a wide region at its top right corner when there is no rail", () => {
    const cover = { col: 0, row: 0, cols: 6, rows: 50 };
    const frame = { cover, regions: [{ col: 0, row: 50, cols: 6, rows: 46 }] };
    const carved = carveInside(frame, 10)!;
    expect(carved.inside).toEqual({ col: 5, row: 50, cols: 1, rows: INSIDE.rows });
    expect(carved.regions).toEqual([
      { col: 0, row: 50, cols: 5, rows: 46 },
      { col: 5, row: 50 + INSIDE.rows, cols: 1, rows: 46 - INSIDE.rows },
    ]);
    expectExactTiling([cover, carved.inside, ...carved.regions], 6, 96);
  });

  it("gives up when no region has room or the split needs more stories", () => {
    const short = { cover: null, regions: [{ col: 0, row: 0, cols: 6, rows: INSIDE.rows }] };
    expect(carveInside(short, 10)).toBeNull();
    const wide = { cover: null, regions: [{ col: 0, row: 0, cols: 6, rows: 96 }] };
    expect(carveInside(wide, 1)).toBeNull();
  });
});

describe("sliceRect", () => {
  const box: Rect = { col: 0, row: 0, cols: 4, rows: 60 };

  it("partitions a box exactly and keeps item order", () => {
    const items = [30, 50, 20, 70, 40].map((area, i) => ({ id: `i${i}`, area }));
    const leaves = sliceRect(box, items, createRandom("x"));
    expect(leaves.map((l) => l.id)).toEqual(items.map((i) => i.id));
    expectExactTiling(leaves.map((l) => l.rect), 4, 60);
  });

  it("gives bigger items bigger leaves", () => {
    const leaves = sliceRect(box, [{ id: "big", area: 180 }, { id: "small", area: 60 }], createRandom("x"));
    const area = (id: string) => {
      const r = leaves.find((l) => l.id === id)!.rect;
      return r.cols * r.rows;
    };
    expect(area("big")).toBeGreaterThan(area("small"));
  });

  it("refuses more items than the box can hold", () => {
    const tiny: Rect = { col: 0, row: 0, cols: 1, rows: 15 };
    const items = [{ id: "a", area: 1 }, { id: "b", area: 1 }];
    expect(() => sliceRect(tiny, items, createRandom("x"))).toThrow(/cannot fit/);
  });
});

describe("cover strategy", () => {
  const articles = makeArticles(10);

  it("defaults to weighing recency, length, and image, with a reason", () => {
    const cover = generatePage(articles, "s").cover!;
    expect(cover.articleId).toBe("a9");
    expect(cover.reason).toMatch(/newest/);
  });

  it("can be tuned by weights", () => {
    const lengthOnly = weightedCoverStrategy({ recency: 0, length: 1, image: 0 });
    const longest = [...articles].sort((a, b) => b.wordCount - a.wordCount)[0];
    expect(lengthOnly.select(articles)?.articleId).toBe(longest.id);
  });

  it("is pluggable, and the chosen cover is set once, as the cover module", () => {
    const oldest: CoverStrategy = {
      name: "oldest",
      select: (list) => ({ articleId: list[0].id, reason: "Oldest first." }),
    };
    const pages = allPages(articles, "s", { coverStrategy: oldest });
    expect(pages[0].cover).toEqual({ articleId: "a0", reason: "Oldest first." });
    expect(pages[0].modules.find((m) => m.kind === "cover")?.articleId).toBe("a0");
    expect(placedIds(pages).filter((id) => id === "a0")).toHaveLength(1);
  });
});

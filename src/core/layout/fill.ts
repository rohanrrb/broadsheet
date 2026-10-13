import { areaWish, type AreaWish } from "./metrics";
import { storyModule } from "./modules";
import type { Random } from "./random";
import { areaOf, capacity, sliceRect, type SliceItem } from "./slice";
import type { ArticleSummary, Module, Rect } from "./types";

/**
 * How many of the next articles to set in `regions`: enough that their
 * comfortable sizes fill the space, never more than their minimum sizes or the
 * regions' leaf capacity allow, and at least one per region.
 */
export function takeArticles(
  remaining: readonly ArticleSummary[],
  regions: readonly Rect[],
): ArticleSummary[] {
  const area = sum(regions.map(areaOf));
  const limit = Math.min(remaining.length, sum(regions.map(capacity)));
  let minTotal = 0;
  let niceTotal = 0;
  let count = 0;
  while (count < limit && niceTotal < area) {
    const wish = areaWish(remaining[count]);
    if (count >= regions.length && minTotal + wish.min > area) break;
    minTotal += wish.min;
    niceTotal += wish.nice;
    count += 1;
  }
  return remaining.slice(0, count);
}

/** Lays the articles out across the regions, most prominent into the first region. */
export function fillRegions(
  regions: readonly Rect[],
  articles: readonly ArticleSummary[],
  random: Random,
): Module[] {
  const ranked = byProminence(articles);
  const targets = targetAreas(ranked.map(areaWish), sum(regions.map(areaOf)));
  const items = ranked.map((a, i) => ({ id: a.id, area: targets[i], max: areaWish(a).max }));
  const byId = new Map(ranked.map((a) => [a.id, a]));
  return assignToRegions(regions, items).flatMap((regionItems, i) =>
    sliceRect(regions[i], regionItems, random).map((leaf) => storyModule(byId.get(leaf.id)!, leaf.rect)),
  );
}

/**
 * Deals items, in rank order, to whichever region has the most unclaimed
 * area, so each region's stories add up to about its size and short pieces
 * are never stretched over a tall rail. Every region gets at least one item
 * and none more than it can hold.
 */
function assignToRegions(regions: readonly Rect[], items: readonly SliceItem[]): SliceItem[][] {
  const groups: SliceItem[][] = regions.map(() => []);
  const room = regions.map(areaOf);
  items.forEach((item, index) => {
    const itemsLeft = items.length - index;
    const empty = groups.filter((g) => g.length === 0).length;
    const open = regions.map((r, i) => {
      const hasSpace = groups[i].length < capacity(r);
      const mustFillEmpty = itemsLeft <= empty && groups[i].length > 0;
      return hasSpace && !mustFillEmpty;
    });
    const i = argMax(room.map((r, j) => (open[j] ? r : -Infinity)));
    groups[i].push(item);
    room[i] -= item.area;
  });
  return groups;
}

/**
 * Photos and longer pieces first; ties keep feed order, so newer stays ahead.
 */
function byProminence(articles: readonly ArticleSummary[]): ArticleSummary[] {
  const score = (a: ArticleSummary) =>
    (a.imageUrl ? 0.5 : 0) + 0.5 * Math.min(a.wordCount / 1200, 1);
  return articles
    .map((article, index) => ({ article, index, score: score(article) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ article }) => article);
}

/**
 * Sizes that add up to `area`: every article grows together from its minimum
 * toward its comfortable size, and past that toward its maximum.
 */
function targetAreas(wishes: readonly AreaWish[], area: number): number[] {
  const total = (key: keyof AreaWish) => sum(wishes.map((w) => w[key]));
  const [from, to] = area <= total("nice") ? (["min", "nice"] as const) : (["nice", "max"] as const);
  const span = total(to) - total(from);
  const t = span > 0 ? clamp01((area - total(from)) / span) : 1;
  return wishes.map((w) => w[from] + (w[to] - w[from]) * t);
}

function argMax(values: number[]): number {
  return values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
}

function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

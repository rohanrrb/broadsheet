import { METRICS, visualAspect } from "./metrics";
import type { Random } from "./random";
import type { Rect } from "./types";

/** Something to place, with the area it should get. */
export interface SliceItem {
  id: string;
  area: number;
  /** Area past which the item runs out of content and would leave blank paper. */
  max?: number;
}

export interface Leaf {
  id: string;
  rect: Rect;
}

/** How many leaves a rectangle can hold without any leaf being too short. */
export function capacity(rect: Rect): number {
  return rect.cols * Math.floor(rect.rows / METRICS.minLeafRows);
}

export function areaOf(rect: Rect): number {
  return rect.cols * rect.rows;
}

/**
 * Guillotine partition: splits `rect` in two with one straight cut, gives each
 * side a contiguous run of the items, and recurses until each item has its own
 * leaf. Leaves tile `rect` exactly, by construction, and keep the items' order.
 * Among all feasible cuts, the one whose sides best match the items' areas and
 * whose leaves have newspaper-like proportions wins; seeded jitter breaks
 * near-ties so pages vary.
 */
export function sliceRect(rect: Rect, items: readonly SliceItem[], random: Random): Leaf[] {
  if (items.length === 0) return [];
  if (items.length > capacity(rect)) {
    throw new Error(`${items.length} items cannot fit a ${rect.cols}x${rect.rows} box.`);
  }
  const leaves: Leaf[] = [];
  sliceInto(rect, scaleTo(items, areaOf(rect)), random, leaves);
  return leaves;
}

function sliceInto(rect: Rect, items: readonly SliceItem[], random: Random, out: Leaf[]): void {
  if (items.length === 1) {
    out.push({ id: items[0].id, rect });
    return;
  }
  const cut = bestCut(rect, items, random);
  const firstItems = items.slice(0, cut.split);
  const secondItems = items.slice(cut.split);
  sliceInto(cut.first, scaleTo(firstItems, areaOf(cut.first)), random, out);
  sliceInto(cut.second, scaleTo(secondItems, areaOf(cut.second)), random, out);
}

interface Cut {
  /** Items before this index go to `first`. */
  split: number;
  first: Rect;
  second: Rect;
}

const JITTER = 0.06;

function bestCut(rect: Rect, items: readonly SliceItem[], random: Random): Cut {
  let best: { cut: Cut; cost: number } | null = null;
  for (const cut of feasibleCuts(rect, items.length)) {
    const cost = cutCost(cut, rect, items) + random() * JITTER;
    if (!best || cost < best.cost) best = { cut, cost };
  }
  // capacity(rect) >= items.length guarantees a feasible cut exists.
  return best!.cut;
}

/** Every cut, at every item split, that leaves both sides enough capacity. */
function* feasibleCuts(rect: Rect, count: number): Generator<Cut> {
  for (let split = 1; split < count; split++) {
    for (let at = 1; at < rect.cols; at++) {
      yield* ifFeasible(verticalCut(rect, at, split), count);
    }
    for (let at = 1; at < rect.rows; at++) {
      yield* ifFeasible(horizontalCut(rect, at, split), count);
    }
  }
}

function* ifFeasible(cut: Cut, count: number): Generator<Cut> {
  if (capacity(cut.first) >= cut.split && capacity(cut.second) >= count - cut.split) {
    yield cut;
  }
}

function verticalCut(rect: Rect, at: number, split: number): Cut {
  return {
    split,
    first: { ...rect, cols: at },
    second: { ...rect, col: rect.col + at, cols: rect.cols - at },
  };
}

function horizontalCut(rect: Rect, at: number, split: number): Cut {
  return {
    split,
    first: { ...rect, rows: at },
    second: { ...rect, row: rect.row + at, rows: rect.rows - at },
  };
}

const AREA_WEIGHT = 4;
const OVERFILL_WEIGHT = 6;

function cutCost(cut: Cut, rect: Rect, items: readonly SliceItem[]): number {
  const firstItems = items.slice(0, cut.split);
  const secondItems = items.slice(cut.split);
  const areaError = Math.abs(areaOf(cut.first) - sumAreas(firstItems)) / areaOf(rect);
  const overfill = (overfillOf(cut.first, firstItems) + overfillOf(cut.second, secondItems)) / areaOf(rect);
  return (
    AREA_WEIGHT * areaError +
    OVERFILL_WEIGHT * overfill +
    shapePenalty(cut.first, firstItems.length) +
    shapePenalty(cut.second, secondItems.length)
  );
}

/** Area a side gives beyond what its items can fill. */
function overfillOf(rect: Rect, items: readonly SliceItem[]): number {
  const max = items.reduce((sum, item) => sum + (item.max ?? Infinity), 0);
  return Math.max(0, areaOf(rect) - max);
}

/** Leaves read best between a tall column and a modest landscape box. */
const ASPECT_RANGE = { low: 0.3, high: 2.4 };

/** Penalizes a single-item side whose proportions fall outside the range. */
function shapePenalty(rect: Rect, itemCount: number): number {
  if (itemCount !== 1) return 0;
  const aspect = visualAspect(rect.cols, rect.rows);
  if (aspect < ASPECT_RANGE.low) return Math.log(ASPECT_RANGE.low / aspect);
  if (aspect > ASPECT_RANGE.high) return Math.log(aspect / ASPECT_RANGE.high);
  return 0;
}

function scaleTo(items: readonly SliceItem[], total: number): SliceItem[] {
  const sum = sumAreas(items);
  return items.map((item) => ({
    ...item,
    area: sum > 0 ? (item.area * total) / sum : total / items.length,
  }));
}

function sumAreas(items: readonly SliceItem[]): number {
  return items.reduce((sum, item) => sum + item.area, 0);
}

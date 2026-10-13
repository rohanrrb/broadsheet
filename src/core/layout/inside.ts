import { METRICS } from "./metrics";
import type { Frame } from "./recipes";
import type { Rect } from "./types";

/**
 * The front page's "Inside" index: a small fixed box that points readers to
 * stories on later pages. It is carved out of a recipe's frame before the
 * slicer runs, so the story regions shrink around it and the page still tiles
 * exactly. Recipes stay unaware of it.
 */
export const INSIDE = { cols: 1, rows: 22 };

/** A frame with the Inside box carved out of one of its regions. */
export interface InsideFrame extends Frame {
  inside: Rect;
}

/**
 * Carves the Inside box from the top of the least prominent rail (the last
 * one-column region). A frame without a rail gives up the top of the right
 * edge of its last region instead, which splits that region in two. Returns
 * null when no region has the room, or when the split would leave more
 * regions than `storiesLeft` can fill.
 */
export function carveInside(frame: Frame, storiesLeft: number): InsideFrame | null {
  const railIndex = frame.regions.findLastIndex((r) => r.cols === INSIDE.cols && tallEnough(r));
  if (railIndex >= 0) return carveRailTop(frame, railIndex);
  const wideIndex = frame.regions.findLastIndex((r) => r.cols > INSIDE.cols && tallEnough(r));
  if (wideIndex < 0 || frame.regions.length + 1 > storiesLeft) return null;
  return carveCorner(frame, wideIndex);
}

/** Room for the box plus at least one story below it. */
function tallEnough(region: Rect): boolean {
  return region.rows >= INSIDE.rows + METRICS.minLeafRows;
}

function carveRailTop(frame: Frame, index: number): InsideFrame {
  const rail = frame.regions[index];
  const inside = { ...rail, rows: INSIDE.rows };
  const below = { ...rail, row: rail.row + INSIDE.rows, rows: rail.rows - INSIDE.rows };
  return { ...frame, inside, regions: frame.regions.map((r, i) => (i === index ? below : r)) };
}

/** Splits a wide region into its main part and a rail whose top holds the box. */
function carveCorner(frame: Frame, index: number): InsideFrame {
  const region = frame.regions[index];
  const railCol = region.col + region.cols - INSIDE.cols;
  const main = { ...region, cols: region.cols - INSIDE.cols };
  const inside = { col: railCol, row: region.row, cols: INSIDE.cols, rows: INSIDE.rows };
  const below = { ...inside, row: region.row + INSIDE.rows, rows: region.rows - INSIDE.rows };
  const regions = [...frame.regions.slice(0, index), main, below, ...frame.regions.slice(index + 1)];
  return { ...frame, inside, regions };
}

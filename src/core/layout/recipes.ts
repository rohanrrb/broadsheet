import { coverRows } from "./modules";
import { pickWeighted, type Random } from "./random";
import type { ArticleSummary, Rect } from "./types";

export interface PageSize {
  cols: number;
  rows: number;
}

/**
 * The first cuts of a page: where the cover goes (front pages only) and the
 * regions the slicer fills with stories. Cover plus regions must tile the page.
 * Regions are listed most prominent first: they receive the strongest stories.
 */
export interface Frame {
  cover: Rect | null;
  regions: Rect[];
}

/**
 * A page archetype, such as "cover over two rails". Front recipes frame a
 * cover, always across the full width at the top of the page: nothing is set
 * beside the cover story. Inner recipes have no cover. `regions` is how many
 * regions `frame` returns, so the engine can skip recipes that need more
 * stories than remain.
 */
export interface PageRecipe {
  id: string;
  page: "front" | "inner";
  regions: number;
  weight: number;
  frame(size: PageSize, cover: ArticleSummary | null): Frame;
}

const rect = (col: number, row: number, cols: number, rows: number): Rect => ({
  col,
  row,
  cols,
  rows,
});

/** Cover across the full width, stories in the band below. Fits any page. */
const BANNER: PageRecipe = {
  id: "banner",
  page: "front",
  regions: 1,
  weight: 2,
  frame({ cols, rows }, cover) {
    const h = coverRows(cover!, cols);
    return { cover: rect(0, 0, cols, h), regions: [rect(0, h, cols, rows - h)] };
  },
};

/** Cover across the full width; below it, a center region between two rails. */
const RAILS: PageRecipe = {
  id: "rails",
  page: "front",
  regions: 3,
  weight: 3,
  frame({ cols, rows }, cover) {
    const h = coverRows(cover!, cols);
    const below = rows - h;
    return {
      cover: rect(0, 0, cols, h),
      regions: [rect(1, h, cols - 2, below), rect(cols - 1, h, 1, below), rect(0, h, 1, below)],
    };
  },
};

/** Cover across the full width; below it, a wide region and one rail. */
function oneRail(side: "left" | "right"): PageRecipe {
  return {
    id: `${side}-rail`,
    page: "front",
    regions: 2,
    weight: 2,
    frame({ cols, rows }, cover) {
      const wide = cols - 1;
      const h = coverRows(cover!, cols);
      const wideCol = side === "left" ? 1 : 0;
      const railCol = side === "left" ? 0 : wide;
      return {
        cover: rect(0, 0, cols, h),
        regions: [rect(wideCol, h, wide, rows - h), rect(railCol, h, 1, rows - h)],
      };
    },
  };
}

/** The whole page as one region. Fits any page. */
const OPEN: PageRecipe = {
  id: "open",
  page: "inner",
  regions: 1,
  weight: 2,
  frame: ({ cols, rows }) => ({ cover: null, regions: [rect(0, 0, cols, rows)] }),
};

const INNER_RAILS: PageRecipe = {
  id: "inner-rails",
  page: "inner",
  regions: 3,
  weight: 2,
  frame: ({ cols, rows }) => ({
    cover: null,
    regions: [rect(1, 0, cols - 2, rows), rect(cols - 1, 0, 1, rows), rect(0, 0, 1, rows)],
  }),
};

function wing(side: "left" | "right"): PageRecipe {
  return {
    id: `${side}-wing`,
    page: "inner",
    regions: 2,
    weight: 1,
    frame({ cols, rows }) {
      const wingCols = 2;
      const mainCol = side === "left" ? wingCols : 0;
      const wingCol = side === "left" ? 0 : cols - wingCols;
      return {
        cover: null,
        regions: [rect(mainCol, 0, cols - wingCols, rows), rect(wingCol, 0, wingCols, rows)],
      };
    },
  };
}

export const DEFAULT_RECIPES: readonly PageRecipe[] = [
  BANNER,
  RAILS,
  oneRail("left"),
  oneRail("right"),
  OPEN,
  INNER_RAILS,
  wing("left"),
  wing("right"),
];

/** A front page whose cover is the only story left: the cover fills it. */
const COVER_ONLY: PageRecipe = {
  id: "cover-only",
  page: "front",
  regions: 0,
  weight: 1,
  frame: ({ cols, rows }) => ({ cover: rect(0, 0, cols, rows), regions: [] }),
};

/** A recipe that can frame any page of the given kind, whatever its height. */
export function fallbackRecipe(page: PageRecipe["page"], storiesLeft: number): PageRecipe {
  if (page === "inner") return OPEN;
  return storiesLeft === 0 ? COVER_ONLY : BANNER;
}

/**
 * Picks a recipe of the right kind that has no more regions than stories
 * left, avoiding the previous page's recipe when another fits.
 */
export function chooseRecipe(
  recipes: readonly PageRecipe[],
  page: PageRecipe["page"],
  storiesLeft: number,
  previousId: string | null,
  random: Random,
): PageRecipe {
  const fitting = recipes.filter(
    (r) => r.page === page && r.regions <= storiesLeft && (r.regions > 0 || storiesLeft === 0),
  );
  if (fitting.length === 0) return fallbackRecipe(page, storiesLeft);
  const fresh = fitting.filter((r) => r.id !== previousId);
  return pickWeighted(fresh.length > 0 ? fresh : fitting, (r) => r.weight, random);
}

import { describe, expect, it } from "vitest";
import { DEFAULT_RECIPES } from "./recipes";
import type { ArticleSummary } from "./types";

const cover: ArticleSummary = {
  id: "c",
  title: "A Cover Story",
  excerpt: "It begins.",
  wordCount: 800,
  createdAt: new Date(0).toISOString(),
  imageUrl: "https://example.com/photo.jpg",
};

describe("front-page recipes", () => {
  const front = DEFAULT_RECIPES.filter((recipe) => recipe.page === "front");

  it.each(front.map((recipe) => [recipe.id, recipe] as const))(
    "%s sets the cover across the full width at the top, with nothing beside it",
    (_, recipe) => {
      const frame = recipe.frame({ cols: 6, rows: 96 }, cover);
      expect(frame.cover).toMatchObject({ col: 0, row: 0, cols: 6 });
      for (const region of frame.regions) expect(region.row).toBeGreaterThanOrEqual(frame.cover!.rows);
    },
  );

  it.each(front.map((recipe) => [recipe.id, recipe] as const))("%s tiles the page", (_, recipe) => {
    const frame = recipe.frame({ cols: 6, rows: 96 }, cover);
    const area = [frame.cover!, ...frame.regions].reduce((sum, r) => sum + r.cols * r.rows, 0);
    expect(area).toBe(6 * 96);
    expect(frame.regions).toHaveLength(recipe.regions);
  });
});

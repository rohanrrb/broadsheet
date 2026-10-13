import { describe, expect, it } from "vitest";
import { freeSlug, pieceHref, slugOf } from "./slug";

describe("slugOf", () => {
  it("sets a headline in lower case, accents off, words joined by hyphens", () => {
    expect(slugOf("Bus Lanes, Reconsidered")).toBe("bus-lanes-reconsidered");
    expect(slugOf("  Café: don’t go!  ")).toBe("cafe-dont-go");
  });

  it("cuts a long headline at a whole word", () => {
    const slug = slugOf(Array(30).fill("word").join(" "));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-word")).toBe(true);
  });

  it("has something to give a headline with no words in it", () => {
    expect(slugOf("?!")).toBe("untitled");
    expect(slugOf("x".repeat(90))).toHaveLength(60);
  });
});

describe("freeSlug", () => {
  it("numbers a headline the writer has used before", () => {
    expect(freeSlug("Bus Lanes", new Set())).toBe("bus-lanes");
    expect(freeSlug("Bus Lanes", new Set(["bus-lanes", "bus-lanes-2"]))).toBe("bus-lanes-3");
  });

  it("keeps clear of the writer's bulletin", () => {
    expect(freeSlug("Bulletin", new Set())).toBe("bulletin-2");
  });
});

describe("pieceHref", () => {
  it("leads under the writer's page, or to the number of a piece with no writer", () => {
    expect(pieceHref({ id: 4, author: "Zébra Lord", writerId: 2, slug: "bus-lanes" })).toBe("/by/zebra-lord/bus-lanes");
    expect(pieceHref({ id: 4, author: "Old Hand", writerId: null, slug: null })).toBe("/w/4");
  });
});

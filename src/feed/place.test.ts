import { describe, expect, it } from "vitest";
import { hrefAt, placeIn } from "./place";

describe("a place in a piece", () => {
  it("is carried in the address and read back from it", () => {
    const href = hrefAt("/by/ana/bus-lanes", { block: 12, words: 34 });
    expect(href).toBe("/by/ana/bus-lanes#at-12-34");
    expect(placeIn(new URL(href, "https://paper.test").hash)).toEqual({ block: 12, words: 34 });
  });

  it("is not read from any other hash", () => {
    for (const hash of ["", "#", "#at-1", "#at-1-x", "#at--1-2", "#notes", "#at-1-2-3"]) expect(placeIn(hash)).toBeNull();
  });
});

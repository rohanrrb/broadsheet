import { describe, expect, it } from "vitest";
import { hrefAt, placeIn } from "./place";

describe("a place in a piece", () => {
  it("is carried in the address and read back from it", () => {
    const href = hrefAt("/by/ana/bus-lanes", { block: 12, words: 34 });
    expect(href).toBe("/by/ana/bus-lanes?at=12-34#continued");
    expect(placeIn(new URL(href, "https://paper.test").searchParams.get("at"))).toEqual({ block: 12, words: 34 });
  });

  it("is not read from anything else", () => {
    for (const at of ["", "1", "1-x", "-1-2", "notes", "1-2-3", undefined, ["1-2"]]) expect(placeIn(at)).toBeNull();
  });
});

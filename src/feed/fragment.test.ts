import { describe, expect, it } from "vitest";
import { continuedAt } from "./fragment";

describe("continuedAt", () => {
  it("points at the last few words shown", () => {
    expect(continuedAt("/by/ana/bus-lanes", "the number nine bus is late again and nobody knows".split(" "))).toBe(
      "/by/ana/bus-lanes#:~:text=is%20late%20again%20and%20nobody%20knows",
    );
  });

  it("escapes what a fragment would read as its own syntax", () => {
    expect(continuedAt("/w/1", ["well-known,", "R&D"])).toBe("/w/1#:~:text=well%2Dknown%2C%20R%26D");
  });

  it("leaves the address alone when no words were shown", () => {
    expect(continuedAt("/w/1", [])).toBe("/w/1");
  });
});

import { describe, expect, it } from "vitest";
import type { Writing } from "@/core/writings";
import { pickRelated } from "./related";

const body = { type: "doc" as const };

/** A feed of pieces, top first: each is [title, writer id]. */
function feedOf(pieces: [string, number | null][]): Writing[] {
  return pieces.map(([title, writerId], i) => ({
    id: i + 1,
    title,
    slug: null,
    body,
    author: `w${writerId}`,
    writerId,
    createdAt: new Date(0),
    position: 1000 - i,
    spikedAt: null,
  }));
}

const titles = (pieces: Writing[]) => pieces.map((piece) => piece.title);

describe("pickRelated", () => {
  const feed = feedOf([
    ["Bus route cut", 2],
    ["A walk", 1],
    ["Sourdough at dawn", 3],
    ["Opinion: Naps", 1],
    ["The night ferry", 4],
    ["Parking again", 5],
    ["Old map", 1],
    ["Council vote", 6],
  ]);

  it("sets the writer's own, then the section's, then the nearest, in feed order", () => {
    // "Council vote" is Metro, by writer 6; "Bus route cut" and "Parking again" are Metro too.
    const picked = pickRelated(feed, feed[7], 4);
    expect(titles(picked)).toEqual(["Bus route cut", "The night ferry", "Parking again", "Old map"]);
  });

  it("takes at most two by the writer, and breaks a tie for nearest toward the top", () => {
    // "A walk" is by writer 1, as are "Opinion: Naps", "Old map" and nothing else in its section.
    const picked = pickRelated(feed, feed[1], 3);
    expect(titles(picked)).toEqual(["Bus route cut", "Opinion: Naps", "Old map"]);
  });

  it("never sets the piece beside itself, and sets what there is on a small paper", () => {
    const small = feedOf([["Only one", 1], ["And another", null]]);
    expect(titles(pickRelated(small, small[0]))).toEqual(["And another"]);
    expect(pickRelated(small.slice(0, 1), small[0])).toEqual([]);
  });
});

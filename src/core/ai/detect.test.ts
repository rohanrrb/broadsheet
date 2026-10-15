import { describe, expect, test } from "vitest";
import { AI_FLAG_THRESHOLD, detectAi } from "./detect";

describe("detectAi", () => {
  test("scores plain, irregular human writing near zero", () => {
    const text =
      "I walked the dog this morning. It was cold. We ran into Sam by the mailboxes and talked for a while " +
      "about nothing much, then I came back in and made coffee because the first pot was already gone.";
    const signal = detectAi(text);
    expect(signal.score).toBeLessThan(AI_FLAG_THRESHOLD);
    expect(signal.reasons).toHaveLength(0);
  });

  test("flags stock AI phrasing", () => {
    const text =
      "It's important to note that this topic matters. In today's fast-paced world, we must delve into " +
      "the realm of possibility, where this underscores the importance of moving forward together.";
    const signal = detectAi(text);
    expect(signal.score).toBeGreaterThanOrEqual(AI_FLAG_THRESHOLD);
    expect(signal.reasons.some((reason) => reason.includes("stock"))).toBe(true);
  });

  test("flags sentences of a strikingly uniform length", () => {
    const sentence = "The committee reviewed every proposal with care and diligence today.";
    const text = Array(6).fill(sentence).join(" ");
    const signal = detectAi(text);
    expect(signal.score).toBeGreaterThanOrEqual(AI_FLAG_THRESHOLD);
    expect(signal.reasons).toContain("sentences run to a strikingly uniform length");
  });

  test("does not judge uniformity from a handful of sentences", () => {
    const text = "Short. Also short. Still short. Yep, short too.";
    const signal = detectAi(text);
    expect(signal.score).toBe(0);
  });

  test("caps the score at 1", () => {
    const sentence = "In today's fast-paced world, it's important to note that we must delve into the realm of change.";
    const text = Array(8).fill(sentence).join(" ");
    const signal = detectAi(text);
    expect(signal.score).toBeLessThanOrEqual(1);
  });
});

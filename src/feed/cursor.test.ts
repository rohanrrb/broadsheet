import { describe, expect, it } from "vitest";
import { decodeFeedCursor, encodeFeedCursor, InvalidFeedCursorError } from "./cursor";

describe("feed cursor", () => {
  it("round-trips through its encoded form", () => {
    const cursor = {
      asOf: 1790451863796,
      layout: { page: 1, offset: 13, coverId: "39", lastRecipeId: "rails" },
    };
    expect(decodeFeedCursor(encodeFeedCursor(cursor))).toEqual(cursor);
  });

  it("carries the writer a feed is kept to", () => {
    const cursor = { asOf: 5, writerId: 7, layout: { page: 1, offset: 4, coverId: "2", lastRecipeId: null } };
    expect(decodeFeedCursor(encodeFeedCursor(cursor))).toEqual(cursor);
    expect(() => decodeFeedCursor(encodeFeedCursor({ ...cursor, writerId: "7" } as never))).toThrow(
      InvalidFeedCursorError,
    );
  });

  it.each(["", "not-base64!", encodeFeedCursor({ asOf: 1, layout: null } as never)])(
    "rejects malformed input %#",
    (input) => {
      expect(() => decodeFeedCursor(input)).toThrow(InvalidFeedCursorError);
    },
  );
});

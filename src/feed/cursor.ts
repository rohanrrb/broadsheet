import type { Cursor } from "@/core/layout";

/**
 * Where the next feed page picks up. `asOf` pins the feed to the writings that
 * existed when the reader opened it (by feed position), so articles published
 * mid-scroll cannot shift the layout cursor's offset. `after` is the feed
 * position of the last story the reader was shown: the layout's own offset is
 * a count, which would point one story too far once a story they have already
 * seen is spiked or moved, so the count is taken again from `after` each time.
 * `writerId` keeps the feed to one writer's pieces; the paper's own feed
 * leaves it out.
 */
export interface FeedCursor {
  asOf: number;
  layout: Cursor;
  after?: number;
  writerId?: number;
}

export class InvalidFeedCursorError extends Error {
  constructor() {
    super("Invalid feed cursor");
    this.name = "InvalidFeedCursorError";
  }
}

export function encodeFeedCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeFeedCursor(encoded: string): FeedCursor {
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (isFeedCursor(value)) return value;
  } catch {
    // Fall through: malformed input is reported the same way as a bad shape.
  }
  throw new InvalidFeedCursorError();
}

function isFeedCursor(value: unknown): value is FeedCursor {
  if (!isRecord(value)) return false;
  return (
    typeof value.asOf === "number" &&
    Number.isFinite(value.asOf) &&
    isLayoutCursor(value.layout) &&
    (value.after === undefined || (typeof value.after === "number" && Number.isFinite(value.after))) &&
    (value.writerId === undefined || isCount(value.writerId))
  );
}

function isLayoutCursor(value: unknown): value is Cursor {
  if (!isRecord(value)) return false;
  return (
    isCount(value.page) &&
    isCount(value.offset) &&
    isNullableString(value.coverId) &&
    isNullableString(value.lastRecipeId)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCount(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

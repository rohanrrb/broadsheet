import type { InstanceDb } from "@/core/db";
import type { Writing } from "@/core/writings";
import { toFeedEntry, type FeedArticle } from "./article";
import { loadFeedWritings } from "./feed";
import { sectionOf } from "./sections";

/** How many pieces are set beside a piece. */
export const RELATED_COUNT = 6;
/** At most this many come from its writer, and this many more from its section, before its neighbours. */
const BY_WRITER = 2;
const IN_SECTION = 2;

/** The pieces in print to set beside `writing`, as the feed shows them. */
export function readRelated(db: InstanceDb, writing: Writing): FeedArticle[] {
  return pickRelated(loadFeedWritings(db), writing).map((piece) => toFeedEntry(piece).article);
}

/**
 * Up to `count` pieces from `feed` (in feed order) to read after `writing`:
 * more by its writer, then more from its section, then whatever sits
 * nearest it in the feed, each in feed order and never itself.
 */
export function pickRelated(feed: readonly Writing[], writing: Writing, count: number = RELATED_COUNT): Writing[] {
  const others = feed.filter((piece) => piece.id !== writing.id);
  const kicker = sectionOf(writing.title).kicker;
  const picked = new Set<Writing>();
  const take = (pieces: readonly Writing[], most: number) => {
    for (const piece of pieces) {
      if (picked.size >= count || most <= 0) return;
      if (picked.has(piece)) continue;
      picked.add(piece);
      most--;
    }
  };
  take(nearestFirst(others.filter((piece) => writing.writerId !== null && piece.writerId === writing.writerId), writing), BY_WRITER);
  take(nearestFirst(others.filter((piece) => sectionOf(piece.title).kicker === kicker), writing), IN_SECTION);
  take(nearestFirst(others, writing), count);
  return others.filter((piece) => picked.has(piece));
}

/** `pieces` by how far they sit from `writing` in the feed, nearest first, the later one first on a tie. */
function nearestFirst(pieces: readonly Writing[], writing: Writing): Writing[] {
  return [...pieces].sort(
    (a, b) => Math.abs(a.position - writing.position) - Math.abs(b.position - writing.position) || b.position - a.position,
  );
}

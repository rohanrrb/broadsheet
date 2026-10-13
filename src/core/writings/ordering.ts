import { and, asc, desc, eq, gt, lt, ne } from "drizzle-orm";
import type { InstanceDb, InstanceTx, Queryable } from "../db/instance";
import { writings } from "../db/schema";
import { OrderingPrecisionError } from "./errors";
import { requireWriting, type Writing } from "./writings";

/** Where to place a writing in the feed, relative to another writing. */
export type FeedPlacement = { above: number } | { below: number };

/** Gap left between neighbours when positions are respaced, in the unit of a timestamp (ms). */
const REBALANCE_GAP = 1000;

/**
 * Owner curation: move a writing directly above or below another in the feed.
 * Only the feed position changes; createdAt and edit history are untouched.
 * When the two neighbours have grown too close to fit a position between
 * them, the whole feed is respaced (order unchanged) and the move retried.
 */
export function moveWriting(db: InstanceDb, id: number, placement: FeedPlacement): Writing {
  return db.transaction((tx) => {
    const writing = requireWriting(tx, id);
    const anchorId = "above" in placement ? placement.above : placement.below;
    if (anchorId === id) return writing;
    requireWriting(tx, anchorId);

    const position = positionFor(tx, id, placement) ?? positionAfterRebalance(tx, id, placement);
    return tx.update(writings).set({ position }).where(eq(writings.id, id)).returning().get();
  });
}

/** The position that puts the writing at `placement`, or null when there is no room for one. */
function positionFor(db: Queryable, movingId: number, placement: FeedPlacement): number | null {
  try {
    return "above" in placement
      ? positionAbove(db, requireWriting(db, placement.above), movingId)
      : positionBelow(db, requireWriting(db, placement.below), movingId);
  } catch (error) {
    if (error instanceof OrderingPrecisionError) return null;
    throw error;
  }
}

function positionAfterRebalance(db: InstanceTx, movingId: number, placement: FeedPlacement): number {
  rebalancePositions(db);
  const position = positionFor(db, movingId, placement);
  if (position === null) throw new OrderingPrecisionError();
  return position;
}

/**
 * Respaces every writing evenly below the current top position, keeping feed
 * order. Positions are unique, so writings are first parked on negative
 * values (real positions are timestamps, always positive) and then set down.
 */
function rebalancePositions(db: InstanceTx): void {
  const ordered = db
    .select({ id: writings.id, position: writings.position })
    .from(writings)
    .orderBy(desc(writings.position))
    .all();
  if (ordered.length === 0) return;

  const top = ordered[0].position;
  ordered.forEach(({ id }, i) => {
    db.update(writings).set({ position: -(i + 1) }).where(eq(writings.id, id)).run();
  });
  ordered.forEach(({ id }, i) => {
    db.update(writings).set({ position: top - i * REBALANCE_GAP }).where(eq(writings.id, id)).run();
  });
}

function positionAbove(db: Queryable, anchor: Writing, movingId: number): number {
  const neighbour = db
    .select({ position: writings.position })
    .from(writings)
    .where(and(gt(writings.position, anchor.position), ne(writings.id, movingId)))
    .orderBy(asc(writings.position))
    .limit(1)
    .get();
  return neighbour ? between(anchor.position, neighbour.position) : anchor.position + 1;
}

function positionBelow(db: Queryable, anchor: Writing, movingId: number): number {
  const neighbour = db
    .select({ position: writings.position })
    .from(writings)
    .where(and(lt(writings.position, anchor.position), ne(writings.id, movingId)))
    .orderBy(desc(writings.position))
    .limit(1)
    .get();
  return neighbour ? between(neighbour.position, anchor.position) : anchor.position - 1;
}

function between(low: number, high: number): number {
  const mid = (low + high) / 2;
  if (mid <= low || mid >= high) throw new OrderingPrecisionError();
  return mid;
}

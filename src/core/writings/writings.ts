import { and, asc, count, desc, eq, gt, isNull, lt } from "drizzle-orm";
import type { InstanceDb, Queryable } from "../db/instance";
import { writingEdits, writings, type TiptapDoc } from "../db/schema";
import { InvalidCursorError, WritingNotFoundError } from "./errors";
import { freeSlug } from "./slug";

/** How many writings `listWritings` returns when no limit is asked for. */
const DEFAULT_PAGE_SIZE = 20;

export type Writing = typeof writings.$inferSelect;
export type WritingEdit = typeof writingEdits.$inferSelect;

/** Dates are deliberately absent: broadsheet sets them. */
export type NewWriting = { title: string; body: TiptapDoc; author: string; writerId?: number; aiScore?: number };
export type WritingChanges = { title?: string; body?: TiptapDoc; aiScore?: number };

export type FeedPage = { items: Writing[]; nextCursor: string | null };

export function createWriting(db: InstanceDb, input: NewWriting): Writing {
  return db.transaction((tx) => {
    const now = new Date();
    return tx
      .insert(writings)
      .values({
        title: input.title,
        slug: input.writerId === undefined ? null : freeSlug(input.title, slugsOf(tx, input.writerId)),
        body: input.body,
        author: input.author,
        writerId: input.writerId,
        createdAt: now,
        position: nextTopPosition(tx, now),
        aiScore: input.aiScore,
      })
      .returning()
      .get();
  });
}

export function getWriting(db: Queryable, id: number): Writing | undefined {
  return db.select().from(writings).where(eq(writings.id, id)).get();
}

/** A writer's piece, by the slug in its address. */
export function getWritingBySlug(db: Queryable, writerId: number, slug: string): Writing | undefined {
  return db.select().from(writings).where(and(eq(writings.writerId, writerId), eq(writings.slug, slug))).get();
}

/** Every slug a writer's pieces hold, spiked ones included: an address is never handed on. */
function slugsOf(db: Queryable, writerId: number): Set<string | null> {
  const rows = db.select({ slug: writings.slug }).from(writings).where(eq(writings.writerId, writerId)).all();
  return new Set(rows.map((row) => row.slug));
}

/**
 * Apply an edit, snapshotting the previous version first. A piece can be
 * edited any number of times; a change that alters nothing is not recorded.
 */
export function editWriting(db: InstanceDb, id: number, changes: WritingChanges): Writing {
  return db.transaction((tx) => {
    const current = requireWriting(tx, id);
    const next = { title: changes.title ?? current.title, body: changes.body ?? current.body };
    if (!differs(current, next)) return current;
    const withScore = { ...next, aiScore: changes.aiScore ?? current.aiScore };

    tx.insert(writingEdits)
      .values({
        writingId: id,
        editedAt: new Date(),
        previousTitle: current.title,
        previousBody: current.body,
      })
      .run();
    return tx.update(writings).set(withScore).where(eq(writings.id, id)).returning().get();
  });
}

/** Past versions of a writing, oldest first, for display to readers. */
export function getEditHistory(db: InstanceDb, writingId: number): WritingEdit[] {
  return db
    .select()
    .from(writingEdits)
    .where(eq(writingEdits.writingId, writingId))
    .orderBy(asc(writingEdits.editedAt), asc(writingEdits.id))
    .all();
}

export function countEdits(db: Queryable, writingId: number): number {
  const row = db
    .select({ n: count() })
    .from(writingEdits)
    .where(eq(writingEdits.writingId, writingId))
    .get();
  return row?.n ?? 0;
}

/**
 * Writings in print, in feed order (newest first unless the owner curated
 * it), paged for infinite scroll. Spiked writings are left out.
 */
export function listWritings(
  db: InstanceDb,
  options: { cursor?: string; limit?: number } = {},
): FeedPage {
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  const rows = db
    .select()
    .from(writings)
    .where(
      and(
        isNull(writings.spikedAt),
        options.cursor ? lt(writings.position, parseCursor(options.cursor)) : undefined,
      ),
    )
    .orderBy(desc(writings.position))
    .limit(limit + 1)
    .all();

  const items = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  return { items, nextCursor: hasMore ? toCursor(items[items.length - 1]) : null };
}

/** The pieces in print either side of a writing in feed order: the one above it and the one below. */
export interface Neighbours {
  previous: Writing | undefined;
  next: Writing | undefined;
}

export function getNeighbours(db: InstanceDb, writing: Writing): Neighbours {
  const inPrint = isNull(writings.spikedAt);
  return {
    previous: db
      .select()
      .from(writings)
      .where(and(inPrint, gt(writings.position, writing.position)))
      .orderBy(asc(writings.position))
      .limit(1)
      .get(),
    next: db
      .select()
      .from(writings)
      .where(and(inPrint, lt(writings.position, writing.position)))
      .orderBy(desc(writings.position))
      .limit(1)
      .get(),
  };
}

/** Every writing, spiked ones included, in feed order: the editor's view of the instance. */
export function listAllWritings(db: InstanceDb): Writing[] {
  return db.select().from(writings).orderBy(desc(writings.position)).all();
}

/** Edits made so far, per writing; writings never edited are absent. */
export function countEditsByWriting(db: InstanceDb): Map<number, number> {
  const rows = db
    .select({ writingId: writingEdits.writingId, n: count() })
    .from(writingEdits)
    .groupBy(writingEdits.writingId)
    .all();
  return new Map(rows.map((row) => [row.writingId, row.n]));
}

/**
 * Owner curation: pull a writing from the paper, or put it back. A spiked
 * writing is hidden from readers but keeps its date, edit history and place
 * in the feed, so restoring it returns it exactly where it was.
 */
export function setSpiked(db: InstanceDb, id: number, spiked: boolean): Writing {
  return db.transaction((tx) => {
    const current = requireWriting(tx, id);
    if (Boolean(current.spikedAt) === spiked) return current;
    const spikedAt = spiked ? new Date() : null;
    return tx.update(writings).set({ spikedAt }).where(eq(writings.id, id)).returning().get();
  });
}

export function requireWriting(db: Queryable, id: number): Writing {
  const writing = getWriting(db, id);
  if (!writing) throw new WritingNotFoundError(id);
  return writing;
}

/** New writings go on top: at their timestamp, or just above a writing moved there. */
function nextTopPosition(db: Queryable, now: Date): number {
  const top = db
    .select({ position: writings.position })
    .from(writings)
    .orderBy(desc(writings.position))
    .limit(1)
    .get();
  return Math.max(now.getTime(), (top?.position ?? -Infinity) + 1);
}

function differs(current: Writing, next: { title: string; body: TiptapDoc }): boolean {
  return current.title !== next.title || JSON.stringify(current.body) !== JSON.stringify(next.body);
}

function toCursor(writing: Writing): string {
  return String(writing.position);
}

function parseCursor(cursor: string): number {
  const position = Number(cursor);
  if (cursor.trim() === "" || !Number.isFinite(position)) throw new InvalidCursorError(cursor);
  return position;
}

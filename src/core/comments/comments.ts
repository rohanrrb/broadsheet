import { and, asc, count, desc, eq, gt, lt } from "drizzle-orm";
import type { InstanceDb } from "../db/instance";
import { comments } from "../db/schema";
import { COMMENTS_PER_PAGE } from "./limits";

export type Comment = typeof comments.$inferSelect;

/** Which way a piece's comments run: the latest first, or as they came. */
export type CommentOrder = "newest" | "oldest";

/** One page of a piece's comments, and the last one's id to go on from, if there are more. */
export interface CommentPage {
  comments: Comment[];
  next: number | null;
}

/**
 * A piece's comments in `order`, a page at a time. `after` is the `next` of
 * the page before; a comment posted or removed meanwhile neither repeats one
 * nor skips one. Ids follow the order comments were posted in.
 */
export function listComments(
  db: InstanceDb,
  writingId: number,
  order: CommentOrder,
  after?: number,
  limit: number = COMMENTS_PER_PAGE,
): CommentPage {
  const newest = order === "newest";
  const onPiece = eq(comments.writingId, writingId);
  const rows = db
    .select()
    .from(comments)
    .where(after === undefined ? onPiece : and(onPiece, newest ? lt(comments.id, after) : gt(comments.id, after)))
    .orderBy(newest ? desc(comments.id) : asc(comments.id))
    .limit(limit + 1)
    .all();
  const page = rows.slice(0, limit);
  return { comments: page, next: rows.length > limit ? page[page.length - 1].id : null };
}

/** How many comments a piece has. */
export function countComments(db: InstanceDb, writingId: number): number {
  return db.select({ n: count() }).from(comments).where(eq(comments.writingId, writingId)).get()?.n ?? 0;
}

/** Sets a comment beside a piece, under the name `author` as it is printed now. */
export function postComment(
  db: InstanceDb,
  input: { writingId: number; writerId: number; author: string; text: string },
  now: Date = new Date(),
): Comment {
  return db
    .insert(comments)
    .values({ ...input, createdAt: now })
    .returning()
    .get();
}

/** Takes a comment down. With `writerId`, only if it is theirs. False if nothing was there to take. */
export function removeComment(db: InstanceDb, id: number, writerId?: number): boolean {
  const where = writerId === undefined ? eq(comments.id, id) : and(eq(comments.id, id), eq(comments.writerId, writerId));
  return db.delete(comments).where(where).run().changes > 0;
}

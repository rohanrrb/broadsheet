import { and, asc, count, desc, eq, gt, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import type { InstanceDb } from "../db/instance";
import { comments } from "../db/schema";
import { COMMENTS_PER_PAGE, MAX_THREAD } from "./limits";

export type Comment = typeof comments.$inferSelect;

/** Which way a piece's comments run: the latest first, or as they came. */
export type CommentOrder = "newest" | "oldest";

/** One page of a piece's comments, and the last one's id to go on from, if there are more. */
export interface CommentPage {
  comments: Comment[];
  next: number | null;
}

/** What a thread holds beneath its first comment: how many replies, and whether the piece's writer is among them. */
export interface ThreadSummary {
  replies: number;
  writerReplied: boolean;
}

/**
 * The comments on the piece itself, not replies, in `order`, a page at a
 * time. `after` is the `next` of the page before; a comment posted or removed
 * meanwhile neither repeats one nor skips one. Ids follow the order comments
 * were posted in.
 */
export function listComments(
  db: InstanceDb,
  writingId: number,
  order: CommentOrder,
  after?: number,
  limit: number = COMMENTS_PER_PAGE,
): CommentPage {
  const newest = order === "newest";
  const onPiece = and(eq(comments.writingId, writingId), isNull(comments.parentId));
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

/** Every reply in the thread that `rootId` begins, as they came, up to `MAX_THREAD`. */
export function listThread(db: InstanceDb, rootId: number): Comment[] {
  return db.select().from(comments).where(eq(comments.threadId, rootId)).orderBy(asc(comments.id)).limit(MAX_THREAD).all();
}

/**
 * For each of these first comments, how many replies its thread has and
 * whether `writerId` (the piece's writer) wrote any of them. Threads with no
 * replies are absent.
 */
export function summarizeThreads(db: InstanceDb, rootIds: number[], writerId: number | null): Map<number, ThreadSummary> {
  if (rootIds.length === 0) return new Map();
  const byWriter = writerId === null ? sql<number>`0` : sql<number>`max(${comments.writerId} = ${writerId})`;
  const rows = db
    .select({ threadId: comments.threadId, replies: count(), byWriter })
    .from(comments)
    .where(inArray(comments.threadId, rootIds))
    .groupBy(comments.threadId)
    .all();
  return new Map(rows.map((row) => [row.threadId!, { replies: row.replies, writerReplied: Boolean(row.byWriter) }]));
}

/** How many comments and replies a piece has, not counting those taken down. */
export function countComments(db: InstanceDb, writingId: number): number {
  return (
    db
      .select({ n: count() })
      .from(comments)
      .where(and(eq(comments.writingId, writingId), ne(comments.text, "")))
      .get()?.n ?? 0
  );
}

export function getComment(db: InstanceDb, id: number): Comment | undefined {
  return db.select().from(comments).where(eq(comments.id, id)).get();
}

/**
 * Sets a comment beside a piece, under the name `author` as it is printed
 * now; with `parentId`, as a reply to that comment, which must be on the
 * same piece and not taken down. Undefined if it is not.
 */
export function postComment(
  db: InstanceDb,
  input: { writingId: number; writerId: number; author: string; text: string; parentId?: number },
  now: Date = new Date(),
): Comment | undefined {
  const { parentId, ...values } = input;
  const parent = parentId === undefined ? undefined : getComment(db, parentId);
  if (parentId !== undefined && (parent?.writingId !== input.writingId || parent.text === "")) return undefined;
  return db
    .insert(comments)
    .values({ ...values, createdAt: now, parentId: parent?.id ?? null, threadId: parent ? (parent.threadId ?? parent.id) : null })
    .returning()
    .get();
}

/**
 * Takes a comment down. With `writerId`, only if it is theirs. One with
 * replies keeps its place, emptied, so the thread under it holds together.
 * False if nothing was there to take.
 */
export function removeComment(db: InstanceDb, id: number, writerId?: number): boolean {
  const comment = getComment(db, id);
  if (!comment || comment.text === "" || (writerId !== undefined && comment.writerId !== writerId)) return false;
  const answered = db.select({ id: comments.id }).from(comments).where(eq(comments.parentId, id)).limit(1).get();
  if (answered) db.update(comments).set({ text: "" }).where(eq(comments.id, id)).run();
  else db.delete(comments).where(eq(comments.id, id)).run();
  return true;
}

import { and, desc, eq, isNull, notInArray } from "drizzle-orm";
import type { InstanceDb } from "../db/instance";
import { notices } from "../db/schema";
import { MAX_NOTICES } from "./limits";

export type Notice = typeof notices.$inferSelect;

/** Whose board: a writer's id, or null for the paper's own. */
export type Board = number | null;

/** A board's notices, newest first. */
export function listNotices(db: InstanceDb, board: Board): Notice[] {
  return db
    .select()
    .from(notices)
    .where(onBoard(board))
    .orderBy(desc(notices.createdAt), desc(notices.id))
    .limit(MAX_NOTICES)
    .all();
}

/** Pins a notice to a board, and takes down whatever that pushes past the board's limit. */
export function postNotice(db: InstanceDb, board: Board, text: string, now: Date = new Date()): Notice {
  return db.transaction((tx) => {
    const notice = tx.insert(notices).values({ writerId: board, text, createdAt: now }).returning().get();
    const kept = tx
      .select({ id: notices.id })
      .from(notices)
      .where(onBoard(board))
      .orderBy(desc(notices.createdAt), desc(notices.id))
      .limit(MAX_NOTICES)
      .all()
      .map((row) => row.id);
    tx.delete(notices).where(and(onBoard(board), notInArray(notices.id, kept))).run();
    return notice;
  });
}

/** Takes a notice down. With `board`, only if it is on that board. False if nothing was there to take. */
export function removeNotice(db: InstanceDb, id: number, board?: Board): boolean {
  const where = board === undefined ? eq(notices.id, id) : and(eq(notices.id, id), onBoard(board));
  return db.delete(notices).where(where).run().changes > 0;
}

function onBoard(board: Board) {
  return board === null ? isNull(notices.writerId) : eq(notices.writerId, board);
}

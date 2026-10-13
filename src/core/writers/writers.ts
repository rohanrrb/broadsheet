import { and, desc, eq, isNull } from "drizzle-orm";
import type { InstanceDb } from "../db/instance";
import { writers, writings } from "../db/schema";
import type { Writing } from "../writings";
import { handleOf } from "./handle";

export type Writer = typeof writers.$inferSelect;

export class NameTakenError extends Error {
  constructor(readonly name: string) {
    super(`The name “${name}” is taken`);
    this.name = "NameTakenError";
  }
}

export function createWriter(db: InstanceDb, input: { name: string; keyHash: string }): Writer {
  const handle = handleOf(input.name);
  return db.transaction((tx) => {
    const taken = tx.select({ id: writers.id }).from(writers).where(eq(writers.handle, handle)).get();
    if (taken) throw new NameTakenError(input.name);
    return tx
      .insert(writers)
      .values({ name: input.name, handle, keyHash: input.keyHash, createdAt: new Date() })
      .returning()
      .get();
  });
}

export function getWriter(db: InstanceDb, id: number): Writer | undefined {
  return db.select().from(writers).where(eq(writers.id, id)).get();
}

/** The writer with this name, however it is cased or spaced. */
export function findWriter(db: InstanceDb, name: string): Writer | undefined {
  return db.select().from(writers).where(eq(writers.handle, handleOf(name))).get();
}

/** Everything a writer has in print, newest first. The feed puts it in the paper's own order. */
export function listWritingsBy(db: InstanceDb, writerId: number): Writing[] {
  return db
    .select()
    .from(writings)
    .where(and(eq(writings.writerId, writerId), isNull(writings.spikedAt)))
    .orderBy(desc(writings.createdAt), desc(writings.id))
    .all();
}

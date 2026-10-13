import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { handleOf } from "../writers/handle";
import * as schema from "./schema";

/** The instance database; `$client` is the SQLite connection itself, for whole-file work like backups. */
export type InstanceDb = BetterSQLite3Database<typeof schema> & { $client: Database.Database };
/** A transaction handle inside `db.transaction(...)`. */
export type InstanceTx = Parameters<Parameters<InstanceDb["transaction"]>[0]>[0];
/** Anything queries can run against: the instance db or an open transaction. */
export type Queryable = InstanceDb | InstanceTx;
export type InstanceSettings = typeof schema.instance.$inferSelect;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "src/core/db/migrations");
/** What a paper is called until its editor names it. */
export const DEFAULT_INSTANCE_NAME = "Untitled";

/**
 * Open (or create) a broadsheet instance. One instance = one SQLite file.
 * Pass ":memory:" for a throwaway instance in tests.
 */
export function openInstance(filePath: string): InstanceDb {
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  ensureInstanceRow(db);
  refoldHandles(db);
  return db;
}

/**
 * Brings every writer's stored handle up to how `handleOf` folds names now.
 * The fold has grown stricter over releases (accents off, look-alike letters
 * made plain), and SQL cannot do it, so it is done here each time a paper is
 * opened. Without it a writer registered under an older fold could not be
 * found by their own name. If two older names now fold to the same handle,
 * the earlier writer takes it and the later keeps the handle they had.
 */
function refoldHandles(db: InstanceDb): void {
  const writers = db.select().from(schema.writers).orderBy(schema.writers.id).all();
  const taken = new Set(writers.map((writer) => writer.handle));
  for (const writer of writers) {
    const handle = handleOf(writer.name);
    if (handle === writer.handle || taken.has(handle)) continue;
    db.update(schema.writers).set({ handle }).where(eq(schema.writers.id, writer.id)).run();
    taken.delete(writer.handle);
    taken.add(handle);
  }
}

export function getInstanceSettings(db: InstanceDb): InstanceSettings {
  return db.select().from(schema.instance).where(eq(schema.instance.id, 1)).get()!;
}

/** What an editor may change about the instance: its name and its own words. */
export type InstanceChanges = Partial<Pick<
  InstanceSettings,
  "name" | "earLeft" | "earRight" | "about" | "agents" | "comicImage" | "comicLink" | "comicCredit"
>>;

export function updateInstance(db: InstanceDb, changes: InstanceChanges): void {
  if (Object.keys(changes).length === 0) return;
  db.update(schema.instance).set(changes).where(eq(schema.instance.id, 1)).run();
}

/** Puts a writing on the cover, or with null hands the choice back to the layout. */
export function setCoverWriting(db: InstanceDb, writingId: number | null): void {
  db.update(schema.instance).set({ coverWritingId: writingId }).where(eq(schema.instance.id, 1)).run();
}

/** Records the key chosen by whoever claimed the paper. Not among the changes an editor can make from the desk. */
export function setEditorKeyHash(db: InstanceDb, hash: string): void {
  db.update(schema.instance).set({ editorKeyHash: hash }).where(eq(schema.instance.id, 1)).run();
}

function ensureInstanceRow(db: InstanceDb): void {
  db.insert(schema.instance)
    .values({ id: 1, name: DEFAULT_INSTANCE_NAME, createdAt: new Date() })
    .onConflictDoNothing()
    .run();
}

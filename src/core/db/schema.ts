import { sql } from "drizzle-orm";
import { blob, check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Minimal shape of a Tiptap (ProseMirror) JSON document. */
export type TiptapDoc = {
  type: "doc";
  content?: unknown[];
};

/**
 * Instance-level settings. One instance = one SQLite file, so this table holds
 * exactly one row (id = 1): the paper's name and its own words, and the hash
 * of its editor's key if it was claimed. Everything
 * that makes one paper differ from another is here or in its writings.
 */
export const instance = sqliteTable(
  "instance",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    /** Left of the front-page nameplate: a motto. */
    earLeft: text("ear_left").notNull().default(""),
    /** Right of the nameplate: a first line set bold, then a note. */
    earRight: text("ear_right").notNull().default(""),
    /** The About page, in Markdown. */
    about: text("about").notNull().default(""),
    /** What the paper asks of AI agents, in Markdown; the page exists only when this does. */
    agents: text("agents").notNull().default(""),
    /** A comic strip set at the foot of the front page: the image's address; none when empty. */
    comicImage: text("comic_image").notNull().default(""),
    /** Where the strip leads when pressed, usually its own page. */
    comicLink: text("comic_link").notNull().default(""),
    /** Who drew it and under what licence, printed beneath. */
    comicCredit: text("comic_credit").notNull().default(""),
    /** The writing the editor has put on the cover; null to leave the choice to the layout. */
    coverWritingId: integer("cover_writing_id"),
    /** Hash of the key chosen when the paper was claimed; null until then. Never sent to a browser. */
    editorKeyHash: text("editor_key_hash"),
  },
  (t) => [check("instance_single_row", sql`${t.id} = 1`)],
);

/**
 * The browsers the editor is signed in on. A session's token lives only in
 * that browser's cookie; this table keeps a digest of it made with the
 * editor's key, so a copy of the paper's file opens nobody's desk, and a
 * change of key leaves every old session unrecognised.
 */
export const editorSessions = sqliteTable("editor_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * A pen name and the key that proves it. No email, no profile: the name and
 * what is published under it are all a writer is. Only a hash of the key is
 * kept, so a lost key cannot be recovered or replaced by anyone.
 */
export const writers = sqliteTable("writers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** The name as the writer set it, printed in bylines. */
  name: text("name").notNull(),
  /** The name folded for comparison, so no two writers can look alike. Also the writer's address. */
  handle: text("handle").notNull().unique(),
  keyHash: text("key_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const writings = sqliteTable("writings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body", { mode: "json" }).$type<TiptapDoc>().notNull(),
  /** The byline as printed, fixed at publication. */
  author: text("author").notNull(),
  /** Who wrote it. Null for pieces published before pen names existed. */
  writerId: integer("writer_id").references(() => writers.id),
  /** Set by broadsheet on insert. Immutable (also enforced by a DB trigger). */
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  /**
   * Feed order, highest first. Starts near createdAt so the default feed is
   * newest first; owners reorder by changing this, never the dates.
   */
  position: real("position").notNull().unique(),
  /**
   * When the instance's editor pulled the piece from the paper; null while it
   * is in print. A spiked writing keeps its date, edits and feed position.
   */
  spikedAt: integer("spiked_at", { mode: "timestamp_ms" }),
});

/** Snapshot of a writing taken just before each edit. */
export const writingEdits = sqliteTable(
  "writing_edits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    writingId: integer("writing_id")
      .notNull()
      .references(() => writings.id, { onDelete: "cascade" }),
    editedAt: integer("edited_at", { mode: "timestamp_ms" }).notNull(),
    previousTitle: text("previous_title").notNull(),
    previousBody: text("previous_body", { mode: "json" }).$type<TiptapDoc>().notNull(),
  },
  (t) => [index("writing_edits_writing_idx").on(t.writingId)],
);

/**
 * A bulletin board: short dated notes, one board for each writer and one for
 * the paper itself, whose notices have no writer.
 */
export const notices = sqliteTable(
  "notices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Whose board it is on. Null for the paper's own. */
    writerId: integer("writer_id").references(() => writers.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("notices_writer_idx").on(t.writerId)],
);

/**
 * Photos uploaded to the paper, kept in its one file with everything else.
 * Each is served at `/i/<name>`; the name is random, so a photo is found only
 * by whoever was given its address.
 */
export const images = sqliteTable(
  "images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    /** Who uploaded it. Null for the editor's, and once its writer is gone. */
    writerId: integer("writer_id").references(() => writers.id, { onDelete: "set null" }),
    /** Its media type, read from the bytes themselves. */
    type: text("type").notNull(),
    bytes: blob("bytes", { mode: "buffer" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("images_writer_idx").on(t.writerId, t.createdAt)],
);

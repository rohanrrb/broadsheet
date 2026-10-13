import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { openInstance, type InstanceDb } from "../db/instance";
import type { TiptapDoc } from "../db/schema";
import {
  InvalidCursorError,
  WritingNotFoundError,
  countEditsByWriting,
  createWriting,
  editWriting,
  getEditHistory,
  getNeighbours,
  getWriting,
  listAllWritings,
  listWritings,
  moveWriting,
  setSpiked,
} from "./index";

const doc = (text: string): TiptapDoc => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const draft = (title: string) => ({ title, body: doc(title), author: "ana" });

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
});

describe("createWriting", () => {
  it("stores the writing and round-trips the Tiptap body", () => {
    const created = createWriting(db, draft("Hello"));
    expect(getWriting(db, created.id)).toEqual(created);
    expect(created.body).toEqual(doc("Hello"));
  });

  it("sets createdAt itself and ignores any smuggled-in date", () => {
    const before = Date.now();
    const smuggled = { ...draft("Old news"), createdAt: new Date(0) } as never;
    const created = createWriting(db, smuggled);
    expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe("editWriting", () => {
  it("updates content and snapshots the previous version", () => {
    const w = createWriting(db, draft("v1"));
    const edited = editWriting(db, w.id, { title: "v2", body: doc("v2") });

    expect(edited.title).toBe("v2");
    const history = getEditHistory(db, w.id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ previousTitle: "v1", previousBody: doc("v1") });
  });

  it("never changes createdAt, even when a date is smuggled in", () => {
    const w = createWriting(db, draft("v1"));
    const edited = editWriting(db, w.id, { title: "v2", createdAt: new Date(0) } as never);
    expect(edited.createdAt).toEqual(w.createdAt);
  });

  it("takes any number of edits, and keeps what each one replaced", () => {
    const w = createWriting(db, draft("v0"));
    for (let i = 1; i <= 5; i++) editWriting(db, w.id, { title: `v${i}` });

    expect(getWriting(db, w.id)?.title).toBe("v5");
    expect(getEditHistory(db, w.id).map((e) => e.previousTitle)).toEqual(["v0", "v1", "v2", "v3", "v4"]);
  });

  it("does not spend an edit on a change that alters nothing", () => {
    const w = createWriting(db, draft("same"));
    editWriting(db, w.id, { title: "same", body: doc("same") });
    expect(getEditHistory(db, w.id)).toHaveLength(0);
  });

  it("throws WritingNotFoundError for unknown ids", () => {
    expect(() => editWriting(db, 999, { title: "x" })).toThrow(WritingNotFoundError);
  });
});

describe("database guards", () => {
  it("rejects direct SQL updates to created_at", () => {
    const w = createWriting(db, draft("x"));
    const update = () => db.run(sql`UPDATE writings SET created_at = 0 WHERE id = ${w.id}`);
    // Drizzle wraps the SQLite error; the trigger's message is on `cause`.
    const sqliteError = expect.objectContaining({ message: expect.stringMatching(/immutable/) });
    expect(update).toThrow(expect.objectContaining({ cause: sqliteError }));
    expect(getWriting(db, w.id)?.createdAt).toEqual(w.createdAt);
  });
});

describe("listWritings", () => {
  it("pages newest first until exhausted", () => {
    const titles = ["a", "b", "c", "d", "e"];
    titles.forEach((t) => createWriting(db, draft(t)));

    const first = listWritings(db, { limit: 2 });
    const second = listWritings(db, { limit: 2, cursor: first.nextCursor! });
    const third = listWritings(db, { limit: 2, cursor: second.nextCursor! });

    expect([first, second, third].flatMap((p) => p.items.map((w) => w.title))).toEqual([
      "e", "d", "c", "b", "a",
    ]);
    expect(third.nextCursor).toBeNull();
  });

  it("returns an empty page for an empty instance", () => {
    expect(listWritings(db)).toEqual({ items: [], nextCursor: null });
  });

  it("rejects malformed cursors", () => {
    expect(() => listWritings(db, { cursor: "nope" })).toThrow(InvalidCursorError);
  });
});

describe("moveWriting", () => {
  const feedTitles = () => listWritings(db).items.map((w) => w.title);

  it("moves a writing above or below another without touching dates", () => {
    const [a, , c] = ["a", "b", "c"].map((t) => createWriting(db, draft(t)));
    // feed: c b a
    moveWriting(db, a.id, { above: c.id });
    expect(feedTitles()).toEqual(["a", "c", "b"]);

    moveWriting(db, a.id, { below: c.id });
    expect(feedTitles()).toEqual(["c", "a", "b"]);

    expect(getWriting(db, a.id)?.createdAt).toEqual(a.createdAt);
  });

  it("can move to the very bottom", () => {
    const [a, b] = ["a", "b"].map((t) => createWriting(db, draft(t)));
    moveWriting(db, b.id, { below: a.id });
    expect(feedTitles()).toEqual(["a", "b"]);
  });

  it("keeps new writings on top after curation", () => {
    const [a, b] = ["a", "b"].map((t) => createWriting(db, draft(t)));
    moveWriting(db, a.id, { above: b.id });
    createWriting(db, draft("new"));
    expect(feedTitles()).toEqual(["new", "a", "b"]);
  });

  it("throws WritingNotFoundError for an unknown anchor", () => {
    const a = createWriting(db, draft("a"));
    expect(() => moveWriting(db, a.id, { above: 999 })).toThrow(WritingNotFoundError);
  });
});

describe("moveWriting under pressure", () => {
  it("respaces the feed when two neighbours run out of room between them", () => {
    const [a, b, c] = ["a", "b", "c"].map((t) => createWriting(db, draft(t)));
    // Swapping two stories in the same gap halves it every time.
    for (let i = 0; i < 200; i++) {
      moveWriting(db, i % 2 ? b.id : a.id, { below: c.id });
    }
    expect(listWritings(db).items.map((w) => w.title)).toEqual(["c", "b", "a"]);
    expect(getWriting(db, a.id)?.createdAt).toEqual(a.createdAt);
  });
});

describe("setSpiked", () => {
  it("hides a writing from the feed and restores it to the same place", () => {
    const [a, b, c] = ["a", "b", "c"].map((t) => createWriting(db, draft(t)));
    setSpiked(db, b.id, true);
    expect(listWritings(db).items.map((w) => w.id)).toEqual([c.id, a.id]);
    expect(listAllWritings(db).map((w) => w.id)).toEqual([c.id, b.id, a.id]);
    expect(getWriting(db, b.id)?.spikedAt).toBeInstanceOf(Date);

    setSpiked(db, b.id, false);
    expect(listWritings(db).items.map((w) => w.id)).toEqual([c.id, b.id, a.id]);
    expect(getWriting(db, b.id)).toEqual(b);
  });

  it("keeps the first spike time when spiked twice", () => {
    const a = createWriting(db, draft("a"));
    const first = setSpiked(db, a.id, true).spikedAt;
    expect(setSpiked(db, a.id, true).spikedAt).toEqual(first);
  });

  it("throws WritingNotFoundError for an unknown writing", () => {
    expect(() => setSpiked(db, 999, true)).toThrow(WritingNotFoundError);
  });
});

describe("getNeighbours", () => {
  it("finds the pieces above and below in feed order, skipping spiked ones", () => {
    const [a, b, c, d] = ["a", "b", "c", "d"].map((t) => createWriting(db, draft(t)));
    // feed: d c b a
    setSpiked(db, c.id, true);
    const around = getNeighbours(db, b);
    expect([around.previous?.id, around.next?.id]).toEqual([d.id, a.id]);
  });

  it("has nothing before the first piece or after the last", () => {
    const [a, b] = ["a", "b"].map((t) => createWriting(db, draft(t)));
    expect(getNeighbours(db, b).previous).toBeUndefined();
    expect(getNeighbours(db, a).next).toBeUndefined();
  });
});

describe("countEditsByWriting", () => {
  it("counts edits per writing", () => {
    const [a, b] = ["a", "b"].map((t) => createWriting(db, draft(t)));
    editWriting(db, a.id, { title: "a2" });
    editWriting(db, a.id, { title: "a3" });
    expect(countEditsByWriting(db)).toEqual(new Map([[a.id, 2]]));
    expect(countEditsByWriting(db).get(b.id)).toBeUndefined();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "@/core/db";
import { createWriting, getEditHistory, getWriting, setSpiked } from "@/core/writings";
import { forgetAttempts } from "./attempts";
import { registerWriter } from "./writers";
import { publishWriting, saveWritingEdit } from "./writings";

const body = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
let db: InstanceDb;
/** Ana's name and key, sent with everything she publishes or edits. */
let ana: { name: string; key: string };
let draft: { title: string; body: unknown; name: string; key: string };
beforeEach(() => {
  forgetAttempts();
  db = openInstance(":memory:");
  ana = writer("Ana");
  draft = { title: "  Bus   Lanes ", body: body("They work."), ...ana };
});

function writer(name: string): { name: string; key: string } {
  const result = registerWriter(db, { name });
  if (!result.ok) throw new Error(result.error);
  return { name: result.name, key: result.key };
}

function publish(input?: unknown): number {
  const result = publishWriting(db, input ?? draft);
  if (!result.ok) throw new Error(result.error);
  return result.id;
}

describe("publishWriting", () => {
  it("creates the writing with tidied fields and a normalized body", () => {
    const writing = getWriting(db, publish())!;
    expect(writing).toMatchObject({ title: "Bus Lanes", author: "Ana" });
    expect(writing.body).toEqual(body("They work."));
  });

  it("ignores a client-sent date", () => {
    const before = Date.now();
    const id = publish({ ...draft, createdAt: "1999-01-01T00:00:00Z" });
    expect(getWriting(db, id)!.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it.each([
    ["no headline", { title: " " }, /headline/],
    ["a blank body", { body: { type: "doc", content: [{ type: "paragraph" }] } }, /Write something/],
    ["an unknown node", { body: { type: "doc", content: [{ type: "codeBlock" }] } }, /could not be read/],
  ])("rejects %s with a 400", (_, change, message) => {
    const result = publishWriting(db, { ...draft, ...change });
    expect(result).toMatchObject({ ok: false, status: 400, error: expect.stringMatching(message) });
  });

  it("rejects something that is not a writing", () => {
    expect(publishWriting(db, "hello")).toMatchObject({ ok: false, status: 400 });
  });

  it("prints the writer's own name, whatever byline the request claims", () => {
    const id = publish({ ...draft, author: "Someone Famous" });
    expect(getWriting(db, id)).toMatchObject({ author: "Ana" });
  });

  it("scores the body for how it reads as AI-written", () => {
    const stockPhrasing = body(
      "It's important to note that in today's fast-paced world, we must delve into the realm of possibility.",
    );
    const id = publish({ ...draft, body: stockPhrasing });
    expect(getWriting(db, id)!.aiScore).toBeGreaterThan(0);
  });

  it.each([
    ["no key", { key: undefined }],
    ["a wrong key", { key: "acorn-acorn-acorn-acorn-acorn-acorn" }],
    ["someone else's name", { name: "Mallory" }],
  ])("refuses to publish with %s", (_, change) => {
    writer("Mallory");
    expect(publishWriting(db, { ...draft, ...change })).toMatchObject({ ok: false, status: 401 });
  });
});

describe("saveWritingEdit", () => {
  it("edits headline and body but never the byline", () => {
    const id = publish();
    expect(saveWritingEdit(db, id, { title: "New", author: "Mallory", body: body("Changed."), key: ana.key })).toMatchObject({ ok: true, id });
    expect(getWriting(db, id)).toMatchObject({ title: "New", author: "Ana", body: body("Changed.") });
  });

  it("keeps taking edits, with no limit on how many", () => {
    const id = publish();
    for (let i = 1; i <= 5; i++) {
      expect(saveWritingEdit(db, id, { title: `v${i}`, body: body("x"), key: ana.key }).ok).toBe(true);
    }
    expect(getEditHistory(db, id)).toHaveLength(5);
  });

  it("lets nobody but the writer edit, not even the editor", () => {
    const id = publish();
    const mallory = writer("Mallory");
    const change = { title: "Hijacked", body: body("x") };
    expect(saveWritingEdit(db, id, { ...change, key: mallory.key })).toMatchObject({ ok: false, status: 403 });
    expect(saveWritingEdit(db, id, change, { editor: true })).toMatchObject({ ok: false, status: 403 });
    expect(getWriting(db, id)).toMatchObject({ title: "Bus Lanes" });
  });

  it("lets only the editor change a piece from before pen names", () => {
    const old = createWriting(db, { title: "Old", author: "Unsigned", body: body("x") as never });
    const change = { title: "Old, corrected", body: body("x") };
    expect(saveWritingEdit(db, old.id, { ...change, key: ana.key })).toMatchObject({ ok: false, status: 403 });
    expect(saveWritingEdit(db, old.id, change, { editor: true })).toEqual({ ok: true, id: old.id, url: `/w/${old.id}` });
  });

  it("reports a missing writing as a 404", () => {
    expect(saveWritingEdit(db, 999, { title: "x", body: body("x") })).toMatchObject({ ok: false, status: 404 });
  });

  it("rescores the body on every edit", () => {
    const id = publish();
    expect(getWriting(db, id)!.aiScore).toBe(0);
    const stockPhrasing = body(
      "It's important to note that in today's fast-paced world, we must delve into the realm of possibility.",
    );
    saveWritingEdit(db, id, { title: "New", body: stockPhrasing, key: ana.key });
    expect(getWriting(db, id)!.aiScore).toBeGreaterThan(0);
  });
});

describe("a spiked piece", () => {
  it("is not there to edit, and says nothing of whose it was", () => {
    const id = publish();
    setSpiked(db, id, true);
    const edit = { title: "New", body: body("New."), key: ana.key };
    expect(saveWritingEdit(db, id, edit)).toEqual(saveWritingEdit(db, 9999, edit));
    expect(saveWritingEdit(db, id, { ...edit, key: "wrong" })).toMatchObject({ ok: false, status: 404 });
    expect(getWriting(db, id)!.title).toBe("Bus Lanes");
  });
});

describe("guessing at a key by saving", () => {
  it("is answered with a 429 once too many keys have been wrong", () => {
    const id = publish();
    for (let i = 0; i < 10; i++) {
      expect(publishWriting(db, { ...draft, key: "wrong" }, "1.2.3.4")).toMatchObject({ ok: false, status: 401 });
    }
    expect(publishWriting(db, draft, "1.2.3.4")).toMatchObject({ ok: false, status: 429 });
    expect(saveWritingEdit(db, id, draft, { editor: false, client: "1.2.3.4" })).toMatchObject({ ok: false, status: 429 });
    expect(publishWriting(db, draft, "5.6.7.8").ok).toBe(true);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "@/core/db";
import { MAX_NOTICE_WORDS, listNotices } from "@/core/notices";
import { findWriter } from "@/core/writers";
import { forgetAttempts } from "./attempts";
import { postPaperNotice, postWriterNotice, removeAnyNotice, removeWriterNotice } from "./notices";
import { registerWriter } from "./writers";

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
  forgetAttempts();
});

function register(name: string) {
  const result = registerWriter(db, { name });
  if (!result.ok) throw new Error(result.error);
  return { name, key: result.key, id: findWriter(db, name)!.id };
}

const words = (count: number) => Array(count).fill("word").join(" ");

describe("postWriterNotice", () => {
  it("pins a tidied notice to the writer's own board", () => {
    const ana = register("Ana");
    expect(postWriterNotice(db, { ...ana, text: "  Away \n until May " })).toEqual({ ok: true });
    expect(listNotices(db, ana.id).map((n) => n.text)).toEqual(["Away until May"]);
    expect(listNotices(db, null)).toEqual([]);
  });

  it("refuses a wrong credential", () => {
    const ana = register("Ana");
    expect(postWriterNotice(db, { name: "Ana", key: "not-it", text: "hi" })).toMatchObject({ ok: false, status: 401 });
    expect(listNotices(db, ana.id)).toEqual([]);
  });

  it("takes a notice of exactly the most words allowed, and not one more", () => {
    const ana = register("Ana");
    expect(postWriterNotice(db, { ...ana, text: words(MAX_NOTICE_WORDS) })).toEqual({ ok: true });
    expect(postWriterNotice(db, { ...ana, text: words(MAX_NOTICE_WORDS + 1) })).toMatchObject({ status: 400 });
  });

  it("refuses an empty notice and one long word", () => {
    const ana = register("Ana");
    expect(postWriterNotice(db, { ...ana, text: "   " })).toMatchObject({ status: 400 });
    expect(postWriterNotice(db, { ...ana, text: "a".repeat(5000) })).toMatchObject({ status: 400 });
    expect(postWriterNotice(db, { ...ana, text: 7 })).toMatchObject({ status: 400 });
  });
});

describe("removeWriterNotice", () => {
  it("takes down the writer's own notice and nobody else's", () => {
    const ana = register("Ana");
    const ben = register("Ben");
    postWriterNotice(db, { ...ana, text: "mine" });
    const [notice] = listNotices(db, ana.id);
    expect(removeWriterNotice(db, notice.id, ben)).toMatchObject({ ok: false, status: 404 });
    expect(listNotices(db, ana.id)).toHaveLength(1);
    expect(removeWriterNotice(db, notice.id, ana)).toEqual({ ok: true });
    expect(listNotices(db, ana.id)).toEqual([]);
  });
});

describe("the editor", () => {
  it("pins to the paper's board, under the same word limit", () => {
    expect(postPaperNotice(db, { text: "Back on Monday" })).toEqual({ ok: true });
    expect(postPaperNotice(db, { text: words(MAX_NOTICE_WORDS + 1) })).toMatchObject({ status: 400 });
    expect(listNotices(db, null).map((n) => n.text)).toEqual(["Back on Monday"]);
  });

  it("can take a notice off any board", () => {
    const ana = register("Ana");
    postWriterNotice(db, { ...ana, text: "mine" });
    const [notice] = listNotices(db, ana.id);
    expect(removeAnyNotice(db, notice.id)).toEqual({ ok: true });
    expect(removeAnyNotice(db, notice.id)).toMatchObject({ status: 404 });
  });
});

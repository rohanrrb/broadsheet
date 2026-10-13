import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "../db/instance";
import { createWriting, setSpiked } from "../writings";
import { NameTakenError, createWriter, findWriter, handleOf, listWritingsBy } from "./index";

const body = { type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] };

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
});

describe("handleOf", () => {
  it("ignores case and treats spaces, hyphens and underscores alike", () => {
    expect(handleOf("  Zebra  Lord ")).toBe("zebra-lord");
    expect(handleOf("zebra_lord")).toBe("zebra-lord");
    expect(handleOf("ZEBRA__LORD")).toBe("zebra-lord");
    expect(handleOf("Zebra-Lord")).toBe("zebra-lord");
    expect(handleOf("Zébra Lørd")).toBe("zebra-lord");
    expect(handleOf("ｚｅｂｒａ lord")).toBe("zebra-lord");
  });
});

describe("createWriter", () => {
  it("keeps the name as written and finds it however it is typed", () => {
    const writer = createWriter(db, { name: "Zebra Lord", keyHash: "h" });
    expect(writer).toMatchObject({ name: "Zebra Lord", handle: "zebra-lord" });
    expect(findWriter(db, "zebra_lord")?.id).toBe(writer.id);
    expect(findWriter(db, "nobody")).toBeUndefined();
  });

  it("refuses a name that looks like one already taken", () => {
    createWriter(db, { name: "zebra_lord", keyHash: "h" });
    expect(() => createWriter(db, { name: "Zebra Lord", keyHash: "other" })).toThrow(NameTakenError);
  });
});

describe("listWritingsBy", () => {
  it("lists what a writer has in print, newest first, and nobody else's", () => {
    const zebra = createWriter(db, { name: "zebra_lord", keyHash: "h" });
    const other = createWriter(db, { name: "quiet_harbor", keyHash: "h" });
    const by = (title: string, writerId?: number) => createWriting(db, { title, body, author: "x", writerId });
    const [a, b, c] = [by("a", zebra.id), by("b", zebra.id), by("c", zebra.id)];
    by("theirs", other.id);
    by("from before pen names");
    setSpiked(db, b.id, true);
    expect(listWritingsBy(db, zebra.id).map((w) => w.id)).toEqual([c.id, a.id]);
  });
});

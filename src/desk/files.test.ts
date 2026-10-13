import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "@/core/db";
import { createWriting, editWriting, setSpiked } from "@/core/writings";
import { readDesk } from "./files";

const body = (words: number) => ({
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text: Array(words).fill("word").join(" ") }] }],
});

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
});

const publish = (title: string, words = 300) => createWriting(db, { title, author: "Ana", body: body(words) });

describe("readDesk", () => {
  it("lists every writing in feed order with where the layout set it", () => {
    const [a, b, c] = ["Council Votes", "Opinion: Keep the Ferry", "Sourdough Returns"].map((t) => publish(t));
    editWriting(db, a.id, { title: "Council Votes Again" });
    setSpiked(db, b.id, true);

    const { files, pages } = readDesk(db, "UTC");
    expect(files.map((f) => f.id)).toEqual([c.id, b.id, a.id]);
    expect(files.map((f) => f.rank)).toEqual([1, null, 2]);
    expect(files[1]).toMatchObject({ headline: "Keep the Ferry", section: "Opinion", spiked: true, page: null, cover: false });
    expect(files[2]).toMatchObject({ section: "Metro", editsUsed: 1, words: 300, page: 1 });
    expect(files.filter((f) => f.cover)).toHaveLength(1);
    expect(pages).toBe(1);
  });

  it("places every writing in print on a page of a longer edition", () => {
    for (let i = 0; i < 30; i++) publish(`Story ${i}`, 400 + i * 20);
    const { files, pages } = readDesk(db, "UTC");
    expect(files.every((f) => f.page !== null && f.page >= 1 && f.page <= pages)).toBe(true);
    expect(pages).toBeGreaterThan(1);
  });

  it("is empty for a new instance", () => {
    expect(readDesk(db, "UTC")).toEqual({ files: [], pages: 0, coverReason: null });
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, setCoverWriting, type InstanceDb, type TiptapDoc } from "@/core/db";
import { createWriter } from "@/core/writers";
import { createWriting, moveWriting, setSpiked } from "@/core/writings";
import { readFeedPage, readWriterPage, writerHasCoverPiece, type FeedView } from "./feed";

const body = (words: number) => ({
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text: Array(words).fill("word").join(" ") }] }],
});

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
});

/** Publishes `count` pieces under a new pen name; `ids` are theirs, as the feed names them. */
function publishAs(name: string, count: number): { writerId: number; ids: string[] } {
  const writerId = createWriter(db, { name, keyHash: "h" }).id;
  const ids = Array.from({ length: count }, (_, i) =>
    String(createWriting(db, { title: `${name} ${i}`, body: body(300), author: name, writerId }).id),
  );
  return { writerId, ids };
}

/** Every page from `first` to the end of its feed, following the cursors a reader's browser would. */
function allPages(first: FeedView): FeedView[] {
  const pages = [first];
  while (pages[pages.length - 1].nextCursor) pages.push(readFeedPage(db, pages[pages.length - 1].nextCursor!));
  return pages;
}

const idsOn = (pages: FeedView[]) => pages.flatMap((page) => page.modules.map((m) => m.article.id));

describe("writerHasCoverPiece", () => {
  const photo = { type: "image", attrs: { src: "https://example.com/a.jpg", alt: "" } };
  const withPhoto = (words: number) => ({ type: "doc" as const, content: [photo, ...body(words).content] });

  it("wants a photo and enough words to set beside it", () => {
    const { writerId } = publishAs("Ana", 3);
    const publish = (doc: TiptapDoc) => createWriting(db, { title: "t", body: doc, author: "Ana", writerId });
    expect(writerHasCoverPiece(db, writerId)).toBe(false);
    publish(withPhoto(20));
    expect(writerHasCoverPiece(db, writerId)).toBe(false);
    publish(withPhoto(200));
    expect(writerHasCoverPiece(db, writerId)).toBe(true);
  });
});

describe("a reader mid-scroll", () => {
  /** Reads page one, lets `change` happen, then scrolls to the end; every story shown, in order. */
  function scrollPast(change: (firstPage: string[]) => void): { first: string[]; all: string[] } {
    const first = readFeedPage(db);
    const shown = first.modules.map((m) => m.article.id);
    change(shown);
    return { first: shown, all: idsOn(allPages(first)) };
  }

  it("misses nothing when a story they have already seen is spiked", () => {
    const { ids } = publishAs("Ana", 40);
    const { first, all } = scrollPast((shown) => setSpiked(db, Number(shown[2]), true));
    expect(first.length).toBeLessThan(40);
    expect([...all].sort()).toEqual([...ids].sort());
  });

  it("misses nothing when a story further on is spiked", () => {
    const { ids } = publishAs("Ana", 40);
    let gone = "";
    const { all } = scrollPast((shown) => {
      gone = ids.find((id) => !shown.includes(id))!;
      setSpiked(db, Number(gone), true);
    });
    expect([...all].sort()).toEqual(ids.filter((id) => id !== gone).sort());
  });

  it("misses none of the others when the editor moves a story they have seen to the end", () => {
    const { ids } = publishAs("Ana", 40);
    let moved = "";
    const { all } = scrollPast((shown) => {
      moved = shown[2];
      moveWriting(db, Number(moved), { below: Number(ids[0]) });
    });
    const others = ids.filter((id) => id !== moved);
    for (const id of others) expect(all.filter((seen) => seen === id)).toHaveLength(1);
  });
});

describe("readWriterPage", () => {
  it("sets a writer's pieces and nobody else's, on the first page and every later one", () => {
    const ana = publishAs("Ana", 30);
    publishAs("Ben", 30);
    const first = readWriterPage(db, ana.writerId);
    const pages = allPages(first);

    expect(first.totalArticles).toBe(30);
    expect(pages.length).toBeGreaterThan(1);
    expect(idsOn(pages).sort()).toEqual([...ana.ids].sort());
  });

  it("sets nothing for a writer with nothing in print", () => {
    publishAs("Ana", 3);
    const quiet = createWriter(db, { name: "Quiet", keyHash: "h" });
    expect(readWriterPage(db, quiet.id)).toMatchObject({ modules: [], nextCursor: null });
  });

  it("opens with a cover story, like the front page", () => {
    const ana = publishAs("Ana", 12);
    expect(readWriterPage(db, ana.writerId).modules[0].kind).toBe("cover");
  });

  it("keeps the layout's own cover, whatever the editor put on the paper's", () => {
    const ana = publishAs("Ana", 6);
    const ben = publishAs("Ben", 6);
    const before = readWriterPage(db, ana.writerId).modules[0].article.id;
    setCoverWriting(db, Number(ben.ids[0]));
    expect(readFeedPage(db).modules[0].article.id).toBe(ben.ids[0]);
    expect(readWriterPage(db, ana.writerId).modules[0].article.id).toBe(before);
  });

  it("leaves the paper's own feed whole", () => {
    const everyone = [...publishAs("Ana", 8).ids, ...publishAs("Ben", 8).ids];
    expect(idsOn(allPages(readFeedPage(db))).sort()).toEqual(everyone.sort());
  });
});

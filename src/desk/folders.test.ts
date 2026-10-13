import { describe, expect, it } from "vitest";
import type { DeskFile } from "./files";
import { FEED_ORDER, PAPER, filesIn, folderPath, folderTree, moveFile, nextSort, sortFiles } from "./folders";

function file(id: number, fields: Partial<DeskFile> = {}): DeskFile {
  return {
    id,
    headline: `Story ${id}`,
    author: "Ana",
    section: "Metro",
    createdAt: new Date(2026, 0, id).toISOString(),
    publishedOn: `Jan ${id}, 2026`,
    words: id * 100,
    editsUsed: 0,
    spiked: false,
    unsigned: false,
    rank: id,
    page: 1,
    cover: false,
    pinned: false,
    ...fields,
  };
}

const FILES = [
  file(1),
  file(2, { author: "Ben", section: "Food" }),
  file(3, { spiked: true, rank: null, page: null }),
  file(4, { author: "Ben" }),
];

const ids = (files: DeskFile[]) => files.map((f) => f.id);

describe("folderTree", () => {
  it("counts writings in print by section and writer, and spiked ones apart", () => {
    const tree = folderTree(FILES);
    expect(tree.paper.count).toBe(3);
    expect(tree.spiked.count).toBe(1);
    expect(tree.sections.map((f) => [f.name, f.count])).toEqual([["Food", 1], ["Metro", 2]]);
    expect(tree.writers.map((f) => [f.name, f.count])).toEqual([["Ana", 1], ["Ben", 2]]);
  });
});

describe("filesIn", () => {
  it("keeps spiked writings out of every folder but Spiked", () => {
    expect(ids(filesIn(FILES, PAPER))).toEqual([1, 2, 4]);
    expect(ids(filesIn(FILES, { kind: "section", name: "Metro" }))).toEqual([1, 4]);
    expect(ids(filesIn(FILES, { kind: "writer", name: "Ben" }))).toEqual([2, 4]);
    expect(ids(filesIn(FILES, { kind: "spiked" }))).toEqual([3]);
  });
});

describe("folderPath", () => {
  it("names the way down from the instance root", () => {
    expect(folderPath(PAPER)).toEqual(["The paper"]);
    expect(folderPath({ kind: "writer", name: "Ben" })).toEqual(["The paper", "Writers", "Ben"]);
  });
});

describe("sortFiles", () => {
  it("leaves feed order alone and reverses on a second click", () => {
    expect(ids(sortFiles(FILES, FEED_ORDER))).toEqual([1, 2, 3, 4]);
    const byWords = nextSort(FEED_ORDER, "words");
    expect(ids(sortFiles(FILES, byWords))).toEqual([1, 2, 3, 4]);
    expect(ids(sortFiles(FILES, nextSort(byWords, "words")))).toEqual([4, 3, 2, 1]);
  });
});

describe("moveFile", () => {
  it("moves a file above or below another and renumbers the ranks in print", () => {
    const moved = moveFile(FILES, 4, { above: 1 });
    expect(ids(moved)).toEqual([4, 1, 2, 3]);
    expect(moved.map((f) => f.rank)).toEqual([1, 2, 3, null]);
    expect(ids(moveFile(FILES, 1, { below: 2 }))).toEqual([2, 1, 3, 4]);
  });

  it("changes nothing for an unknown file or anchor", () => {
    expect(ids(moveFile(FILES, 9, { above: 1 }))).toEqual([1, 2, 3, 4]);
    expect(ids(moveFile(FILES, 1, { above: 9 }))).toEqual([1, 2, 3, 4]);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "../db/instance";
import { createWriter } from "../writers";
import { createWriting } from "../writings";
import { countComments, listComments, postComment, removeComment, tidyComment } from "./index";

const body = { type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] };

let db: InstanceDb;
let piece: number;
let writer: number;
beforeEach(() => {
  db = openInstance(":memory:");
  writer = createWriter(db, { name: "zebra_lord", keyHash: "h" }).id;
  piece = createWriting(db, { title: "A piece", body, author: "zebra_lord", writerId: writer }).id;
});

function post(text: string, writingId = piece) {
  return postComment(db, { writingId, writerId: writer, author: "zebra_lord", text });
}

describe("listComments", () => {
  it("pages through a piece's comments either way without repeating or skipping one", () => {
    for (let i = 1; i <= 7; i++) post(`c${i}`);
    const texts = (order: "newest" | "oldest") => {
      const seen: string[] = [];
      let after: number | undefined;
      for (;;) {
        const page = listComments(db, piece, order, after, 3);
        seen.push(...page.comments.map((c) => c.text));
        if (page.next === null) return seen;
        after = page.next;
      }
    };
    expect(texts("newest")).toEqual(["c7", "c6", "c5", "c4", "c3", "c2", "c1"]);
    expect(texts("oldest")).toEqual(["c1", "c2", "c3", "c4", "c5", "c6", "c7"]);
  });

  it("keeps to the piece asked for", () => {
    const other = createWriting(db, { title: "Another", body, author: "zebra_lord", writerId: writer }).id;
    post("here");
    post("there", other);
    expect(listComments(db, piece, "newest").comments.map((c) => c.text)).toEqual(["here"]);
    expect(countComments(db, piece)).toBe(1);
  });

  it("goes on from where it left off when the comment it stopped at is gone", () => {
    for (let i = 1; i <= 4; i++) post(`c${i}`);
    const first = listComments(db, piece, "newest", undefined, 2);
    removeComment(db, first.next!);
    expect(listComments(db, piece, "newest", first.next!, 2).comments.map((c) => c.text)).toEqual(["c2", "c1"]);
  });
});

describe("removeComment", () => {
  it("takes down only the writer's own when a writer is named", () => {
    const comment = post("mine");
    const other = createWriter(db, { name: "someone", keyHash: "h" }).id;
    expect(removeComment(db, comment.id, other)).toBe(false);
    expect(removeComment(db, comment.id, writer)).toBe(true);
    expect(countComments(db, piece)).toBe(0);
  });
});

describe("tidyComment", () => {
  it("keeps paragraphs and nothing else of the spacing", () => {
    expect(tidyComment("  one\n two  \n\n\n  three\t four \n")).toBe("one two\n\nthree four");
    expect(tidyComment(" \n\n ")).toBe("");
  });
});

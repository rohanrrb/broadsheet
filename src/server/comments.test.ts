import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "@/core/db";
import { MAX_COMMENT_WORDS, countComments } from "@/core/comments";
import { findWriter } from "@/core/writers";
import { createWriting, setSpiked } from "@/core/writings";
import { forgetAttempts } from "./attempts";
import {
  parseId,
  postWriterComment,
  readComments,
  readThread,
  removeAnyComment,
  removeWriterComment,
  toCommentView,
} from "./comments";
import { registerWriter } from "./writers";

const body = { type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] };
const TZ = "America/New_York";

let db: InstanceDb;
let piece: number;
let author: { name: string; key: string; id: number };
let onPiece: { id: number; writerId: number | null };
beforeEach(() => {
  db = openInstance(":memory:");
  forgetAttempts();
  author = register("Writer");
  piece = createWriting(db, { title: "A piece", body, author: "Writer", writerId: author.id }).id;
  onPiece = { id: piece, writerId: author.id };
});

function register(name: string) {
  const result = registerWriter(db, { name });
  if (!result.ok) throw new Error(result.error);
  return { name, key: result.key, id: findWriter(db, name)!.id };
}

const words = (count: number) => Array(count).fill("word").join(" ");

describe("postWriterComment", () => {
  it("sets a tidied comment beside the piece under the writer's name as they set it", () => {
    const ana = register("Ana Lee");
    const result = postWriterComment(db, piece, { name: "ana_lee", key: ana.key, text: " Yes \n\n\n and  no " }, TZ);
    expect(result).toMatchObject({ ok: true, comment: { author: "Ana Lee", href: "/by/ana-lee", text: "Yes\n\nand no" } });
    expect(readComments(db, onPiece, {}, TZ).comments).toHaveLength(1);
  });

  it("refuses a wrong credential, an empty comment and a long one", () => {
    const ana = register("Ana");
    expect(postWriterComment(db, piece, { name: "Ana", key: "nope", text: "hi" }, TZ)).toMatchObject({ status: 401 });
    expect(postWriterComment(db, piece, { ...ana, text: " " }, TZ)).toMatchObject({ status: 400 });
    expect(postWriterComment(db, piece, { ...ana, text: words(MAX_COMMENT_WORDS + 1) }, TZ)).toMatchObject({ status: 400 });
    expect(postWriterComment(db, piece, { ...ana, text: words(MAX_COMMENT_WORDS) }, TZ)).toMatchObject({ ok: true });
  });

  it("refuses a piece that is spiked or not there", () => {
    const ana = register("Ana");
    setSpiked(db, piece, true);
    expect(postWriterComment(db, piece, { ...ana, text: "hi" }, TZ)).toMatchObject({ status: 404 });
    expect(postWriterComment(db, 999, { ...ana, text: "hi" }, TZ)).toMatchObject({ status: 404 });
    expect(countComments(db, piece)).toBe(0);
  });

  it("stops a writer who comments too often", () => {
    const ana = register("Ana");
    for (let i = 0; i < 10; i++) expect(postWriterComment(db, piece, { ...ana, text: `c${i}` }, TZ).ok).toBe(true);
    expect(postWriterComment(db, piece, { ...ana, text: "one more" }, TZ)).toMatchObject({ status: 429 });
    expect(postWriterComment(db, piece, { ...register("Ben"), text: "mine" }, TZ).ok).toBe(true);
  });
});

describe("removing comments", () => {
  it("lets a writer take down their own and the editor any", () => {
    const ana = register("Ana");
    const ben = register("Ben");
    const result = postWriterComment(db, piece, { ...ana, text: "mine" }, TZ);
    if (!result.ok) throw new Error(result.error);
    expect(removeWriterComment(db, result.comment.id, ben)).toMatchObject({ status: 404 });
    expect(removeWriterComment(db, result.comment.id, ana)).toEqual({ ok: true });
    const again = postWriterComment(db, piece, { ...ana, text: "again" }, TZ);
    if (!again.ok) throw new Error(again.error);
    expect(removeAnyComment(db, again.comment.id)).toEqual({ ok: true });
    expect(removeAnyComment(db, again.comment.id)).toMatchObject({ status: 404 });
  });
});

describe("readComments", () => {
  it("reads the order and where to go on from out of a query, ignoring nonsense", () => {
    const ana = register("Ana");
    for (const text of ["a", "b", "c"]) postWriterComment(db, piece, { ...ana, text }, TZ);
    const texts = (query: { order?: unknown; after?: unknown }) => readComments(db, onPiece, query, TZ).comments.map((c) => c.text);
    expect(texts({})).toEqual(["c", "b", "a"]);
    expect(texts({ order: "oldest" })).toEqual(["a", "b", "c"]);
    expect(texts({ order: "sideways", after: "1e3" })).toEqual(["c", "b", "a"]);
  });
});

describe("toCommentView", () => {
  it("dates a comment to the minute, with the year only when it is not this one", () => {
    const comment = {
      id: 1,
      writingId: 1,
      writerId: 1,
      author: "Ana",
      text: "hi",
      createdAt: new Date("2026-03-04T17:05:00Z"),
      parentId: null,
      threadId: null,
    };
    expect(toCommentView(comment, TZ, 2, new Date("2026-06-01")).date).toBe("Mar 4, 12:05 PM");
    expect(toCommentView(comment, TZ, 2, new Date("2027-06-01")).date).toBe("Mar 4, 2026, 12:05 PM");
  });
});

describe("parseId", () => {
  it("takes whole positive numbers only", () => {
    expect(parseId("12")).toBe(12);
    for (const raw of ["0", "-1", "1.5", "1e3", "", undefined, 3]) expect(parseId(raw)).toBeNull();
  });
});

describe("replies", () => {
  it("threads a reply under its comment, marks the piece's writer, and sums the thread on the comment", () => {
    const ana = register("Ana");
    const question = postWriterComment(db, piece, { ...ana, text: "Why?" }, TZ);
    if (!question.ok) throw new Error(question.error);
    const answer = postWriterComment(db, piece, { ...author, text: "Because.", parent: question.comment.id }, TZ);
    expect(answer).toMatchObject({ ok: true, comment: { parentId: question.comment.id, byWriter: true } });
    const [shown] = readComments(db, onPiece, {}, TZ).comments;
    expect(shown).toMatchObject({ text: "Why?", byWriter: false, replies: 1, writerReplied: true });
    expect(readThread(db, onPiece, String(question.comment.id), TZ)?.map((c) => c.text)).toEqual(["Because."]);
  });

  it("refuses a reply to nothing, to a reply's thread from elsewhere, or to a comment taken down", () => {
    const ana = register("Ana");
    expect(postWriterComment(db, piece, { ...ana, text: "x", parent: 999 }, TZ)).toMatchObject({ status: 404 });
    expect(postWriterComment(db, piece, { ...ana, text: "x", parent: "nope" }, TZ)).toMatchObject({ status: 404 });
    const gone = postWriterComment(db, piece, { ...ana, text: "soon gone" }, TZ);
    if (!gone.ok) throw new Error(gone.error);
    removeAnyComment(db, gone.comment.id);
    expect(postWriterComment(db, piece, { ...ana, text: "x", parent: gone.comment.id }, TZ)).toMatchObject({ status: 404 });
    expect(readThread(db, { id: 999, writerId: null }, String(gone.comment.id), TZ)).toBeNull();
  });

  it("keeps a comment taken down with replies as an empty place in its thread", () => {
    const ana = register("Ana");
    const first = postWriterComment(db, piece, { ...ana, text: "first" }, TZ);
    if (!first.ok) throw new Error(first.error);
    postWriterComment(db, piece, { ...ana, text: "reply", parent: first.comment.id }, TZ);
    expect(removeWriterComment(db, first.comment.id, ana)).toEqual({ ok: true });
    expect(readComments(db, onPiece, {}, TZ).comments[0]).toMatchObject({ text: "", author: "", replies: 1 });
  });
});

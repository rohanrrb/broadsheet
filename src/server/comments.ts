import type { InstanceDb } from "@/core/db";
import {
  MAX_COMMENT_LENGTH,
  MAX_COMMENT_WORDS,
  countCommentWords,
  getComment,
  listComments,
  listThread,
  postComment,
  removeComment,
  summarizeThreads,
  tidyComment,
  type Comment,
  type CommentOrder,
} from "@/core/comments";
import { handleOf } from "@/core/writers";
import { getWriting, type Writing } from "@/core/writings";
import { isBlocked, recordAttempt, TooManyAttemptsError, TOO_MANY_ATTEMPTS, UNKNOWN_CLIENT, type Limit } from "./attempts";
import type { DeskResult } from "./desk";
import { fieldOf } from "./fields";
import { authenticateWriter } from "./writers";

/**
 * Comments' boundary: untrusted JSON in, a comment or reply set beside a
 * piece or taken down. A writer comments and removes their own with their
 * name and key; the editor can take any comment down.
 */

/** A comment as the column prints it. */
export interface CommentView {
  id: number;
  /** The comment it answers; null for one on the piece itself. */
  parentId: number | null;
  /** Empty once taken down. */
  author: string;
  /** The commenter's page. */
  href: string;
  /** Whether the piece's own writer wrote it. */
  byWriter: boolean;
  /** Paragraphs, split by a blank line; empty once taken down. */
  text: string;
  /** When it was posted, as printed, and as a machine reads it. */
  date: string;
  dateTime: string;
  /** For a comment on the piece itself: how many replies its thread holds, and whether the piece's writer is among them. */
  replies?: number;
  writerReplied?: boolean;
}

/** The piece a comment is on, as far as comments need to know it. */
export type CommentedPiece = Pick<Writing, "id" | "writerId">;

export interface CommentPageView {
  comments: CommentView[];
  /** Where the next page starts, if there is one. */
  next: number | null;
}

export type CommentResult =
  | { ok: true; comment: CommentView }
  | { ok: false; status: 400 | 401 | 404 | 429; error: string };

export type RemoveCommentResult = { ok: true } | { ok: false; status: 401 | 404 | 429; error: string };

/** Comments one writer may post in ten minutes, and the whole paper may take. */
const COMMENT_LIMITS = { perWriter: 10, overall: 300 };

const NO_SUCH_PIECE = { ok: false, status: 404, error: "That piece is gone." } as const;
const NO_SUCH_COMMENT = { ok: false, status: 404, error: "That comment is gone." } as const;

/**
 * One page of a piece's own comments, read from a query's `order` and
 * `after`, dated in `timeZone`, each with what its thread holds.
 */
export function readComments(
  db: InstanceDb,
  piece: CommentedPiece,
  query: { order?: unknown; after?: unknown },
  timeZone: string,
): CommentPageView {
  const after = parseId(query.after);
  const page = listComments(db, piece.id, orderOf(query.order), after ?? undefined);
  const threads = summarizeThreads(db, page.comments.map((comment) => comment.id), piece.writerId);
  return {
    comments: page.comments.map((comment) => ({
      ...toCommentView(comment, timeZone, piece.writerId),
      replies: threads.get(comment.id)?.replies ?? 0,
      writerReplied: threads.get(comment.id)?.writerReplied ?? false,
    })),
    next: page.next,
  };
}

/** Every reply in the thread a comment on this piece begins, as they came; null if it is not one. */
export function readThread(db: InstanceDb, piece: CommentedPiece, rawRootId: unknown, timeZone: string): CommentView[] | null {
  const rootId = parseId(rawRootId);
  const root = rootId === null ? undefined : getComment(db, rootId);
  if (!root || root.writingId !== piece.id || root.parentId !== null) return null;
  return listThread(db, root.id).map((comment) => toCommentView(comment, timeZone, piece.writerId));
}

/** {name, key, text, parent?}: sets `text` beside the piece under the writer's name, or as a reply to `parent`. */
export function postWriterComment(
  db: InstanceDb,
  writingId: number,
  json: unknown,
  timeZone: string,
  client: string = UNKNOWN_CLIENT,
): CommentResult {
  const text = commentText(json);
  if (!text.ok) return text;
  const writing = getWriting(db, writingId);
  if (!writing || writing.spikedAt) return NO_SUCH_PIECE;
  const rawParent = fieldOf(json, "parent");
  const parentId = rawParent === undefined || rawParent === null ? undefined : parseId(String(rawParent));
  if (parentId === null) return NO_SUCH_COMMENT;
  return asWriter(db, json, client, (writer) => {
    const limits = commentLimits(writer.id);
    if (isBlocked(limits)) return { ok: false, status: 429, error: TOO_MANY_ATTEMPTS };
    const comment = postComment(db, { writingId, writerId: writer.id, author: writer.name, text: text.text, parentId });
    if (!comment) return NO_SUCH_COMMENT;
    recordAttempt(limits);
    return { ok: true, comment: toCommentView(comment, timeZone, writing.writerId) };
  });
}

/** {name, key}: takes one of the writer's own comments down. */
export function removeWriterComment(
  db: InstanceDb,
  id: number,
  json: unknown,
  client: string = UNKNOWN_CLIENT,
): RemoveCommentResult {
  return asWriter(db, json, client, (writer) => (removeComment(db, id, writer.id) ? { ok: true } : NO_SUCH_COMMENT));
}

/** Takes any comment down. For the editor; the route checks who is asking. */
export function removeAnyComment(db: InstanceDb, id: number): DeskResult {
  return removeComment(db, id) ? { ok: true } : NO_SUCH_COMMENT;
}

/** An id from a route segment or query, or null if it cannot be one. */
export function parseId(raw: unknown): number | null {
  const id = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * A comment as the column prints it: dated to the minute in `timeZone`, the
 * year only if it is not this one, and marked if `pieceWriterId` wrote it.
 * One taken down keeps only its place.
 */
export function toCommentView(
  comment: Comment,
  timeZone: string,
  pieceWriterId: number | null,
  now: Date = new Date(),
): CommentView {
  const year = (date: Date) => date.toLocaleDateString("en-US", { timeZone, year: "numeric" });
  const removed = comment.text === "";
  return {
    id: comment.id,
    parentId: comment.parentId,
    author: removed ? "" : comment.author,
    href: removed ? "" : `/by/${encodeURIComponent(handleOf(comment.author))}`,
    byWriter: !removed && comment.writerId === pieceWriterId,
    text: comment.text,
    date: comment.createdAt.toLocaleString("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      year: year(comment.createdAt) === year(now) ? undefined : "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    dateTime: comment.createdAt.toISOString(),
  };
}

function orderOf(raw: unknown): CommentOrder {
  return raw === "oldest" ? "oldest" : "newest";
}

function commentLimits(writerId: number): Limit[] {
  return [
    { key: `comments:${writerId}`, limit: COMMENT_LIMITS.perWriter },
    { key: "comments", limit: COMMENT_LIMITS.overall },
  ];
}

function asWriter<T extends { ok: boolean }>(
  db: InstanceDb,
  json: unknown,
  client: string,
  change: (writer: { id: number; name: string }) => T,
): T | { ok: false; status: 401 | 429; error: string } {
  try {
    const writer = authenticateWriter(db, fieldOf(json, "name"), fieldOf(json, "key"), client);
    if (!writer) return { ok: false, status: 401, error: "That moniker and credential do not match." };
    return change(writer);
  } catch (error) {
    if (error instanceof TooManyAttemptsError) return { ok: false, status: 429, error: error.message };
    throw error;
  }
}

function commentText(json: unknown): { ok: true; text: string } | { ok: false; status: 400; error: string } {
  const raw = fieldOf(json, "text");
  const text = typeof raw === "string" ? tidyComment(raw) : "";
  if (!text) return { ok: false, status: 400, error: "A comment needs words." };
  if (countCommentWords(text) > MAX_COMMENT_WORDS || text.length > MAX_COMMENT_LENGTH) {
    return { ok: false, status: 400, error: `A comment is ${MAX_COMMENT_WORDS} words at most.` };
  }
  return { ok: true, text };
}

import type { InstanceDb } from "@/core/db";
import {
  MAX_NOTICE_LENGTH,
  MAX_NOTICE_WORDS,
  countWords,
  postNotice,
  removeNotice,
  tidyNotice,
} from "@/core/notices";
import { TooManyAttemptsError, UNKNOWN_CLIENT } from "./attempts";
import type { DeskResult } from "./desk";
import { fieldOf } from "./fields";
import { authenticateWriter } from "./writers";

/**
 * The bulletin boards' boundary: untrusted JSON in, a notice pinned up or
 * taken down. A writer changes their own board with their name and key; the
 * editor changes the paper's, and can take a notice off any board.
 */

export type NoticeResult = { ok: true } | { ok: false; status: 400 | 401 | 404 | 429; error: string };

const NO_SUCH_NOTICE = { ok: false, status: 404, error: "That notice is gone." } as const;

/** {name, key, text}: pins `text` to the writer's own board. */
export function postWriterNotice(db: InstanceDb, json: unknown, client: string = UNKNOWN_CLIENT): NoticeResult {
  const text = noticeText(json);
  if (!text.ok) return text;
  return asWriter(db, json, client, (writerId) => {
    postNotice(db, writerId, text.text);
    return { ok: true };
  });
}

/** {name, key}: takes one of the writer's own notices down. */
export function removeWriterNotice(
  db: InstanceDb,
  id: number,
  json: unknown,
  client: string = UNKNOWN_CLIENT,
): NoticeResult {
  return asWriter(db, json, client, (writerId) => (removeNotice(db, id, writerId) ? { ok: true } : NO_SUCH_NOTICE));
}

/** {text}: pins `text` to the paper's board. For the editor; the route checks who is asking. */
export function postPaperNotice(db: InstanceDb, json: unknown): DeskResult {
  const text = noticeText(json);
  if (!text.ok) return text;
  postNotice(db, null, text.text);
  return { ok: true };
}

/** Takes a notice off whichever board it is on. For the editor; the route checks who is asking. */
export function removeAnyNotice(db: InstanceDb, id: number): DeskResult {
  return removeNotice(db, id) ? { ok: true } : NO_SUCH_NOTICE;
}

/** A notice id from a route segment, or null if it cannot be one. */
export function parseNoticeId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function asWriter(db: InstanceDb, json: unknown, client: string, change: (writerId: number) => NoticeResult): NoticeResult {
  try {
    const writer = authenticateWriter(db, fieldOf(json, "name"), fieldOf(json, "key"), client);
    if (!writer) return { ok: false, status: 401, error: "That moniker and credential do not match." };
    return change(writer.id);
  } catch (error) {
    if (error instanceof TooManyAttemptsError) return { ok: false, status: 429, error: error.message };
    throw error;
  }
}

function noticeText(json: unknown): { ok: true; text: string } | { ok: false; status: 400; error: string } {
  const raw = fieldOf(json, "text");
  const text = typeof raw === "string" ? tidyNotice(raw) : "";
  if (!text) return { ok: false, status: 400, error: "A notice needs words." };
  if (countWords(text) > MAX_NOTICE_WORDS || text.length > MAX_NOTICE_LENGTH) {
    return { ok: false, status: 400, error: `A notice is ${MAX_NOTICE_WORDS} words at most.` };
  }
  return { ok: true, text };
}

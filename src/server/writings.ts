import type { InstanceDb } from "@/core/db";
import {
  WritingNotFoundError,
  createWriting,
  editWriting,
  getWriting,
  pieceHref,
  type Writing,
  type WritingChanges,
} from "@/core/writings";
import { TooManyAttemptsError, UNKNOWN_CLIENT } from "./attempts";
import { authenticateWriter, isWritersKey } from "./writers";
import { InvalidDocumentError, isBlankDoc, normalizeDoc } from "@/editor/schema";

/**
 * The publishing boundary: untrusted JSON from the editor in, a writing saved
 * through core out. A request carries a headline, a body, and the pen name and
 * key of whoever is writing; the byline is that writer's name, never something
 * typed. Dates and anything else a client sends are ignored, because
 * broadsheet sets them.
 */

export const MAX_TITLE_LENGTH = 200;

export type SaveResult =
  | { ok: true; id: number; url: string }
  | { ok: false; status: 400 | 401 | 403 | 404 | 429; error: string };

/** `client` is whoever is asking, for counting wrong keys: see `clientOf`. */
export function publishWriting(db: InstanceDb, json: unknown, client: string = UNKNOWN_CLIENT): SaveResult {
  return attempt(() => {
    const fields = asRecord(json);
    const piece = parseWritingChanges(json);
    const writer = authenticateWriter(db, fields.name, fields.key, client);
    if (!writer) throw new NotTheWriterError("That moniker and credential do not match. Check the credential, or start a new moniker.");
    return createWriting(db, { ...piece, author: writer.name, writerId: writer.id });
  });
}

/**
 * Saves an edit for whoever may make it: the piece's writer, proved by their
 * key. A piece from before pen names has no writer, so only the editor can
 * change it.
 */
export function saveWritingEdit(
  db: InstanceDb,
  id: number,
  json: unknown,
  by: { editor: boolean; client?: string } = { editor: false },
): SaveResult {
  return attempt(() => {
    const changes = parseWritingChanges(json);
    const writing = getWriting(db, id);
    // A spiked piece is out of the paper: to everyone but the editor it is not there to edit.
    if (!writing || (writing.spikedAt && !by.editor)) throw new WritingNotFoundError(id);
    if (!mayEdit(db, writing.writerId, asRecord(json).key, by)) {
      throw new NotTheWriterError(
        writing.writerId
          ? `Only ${writing.author} can edit this piece.`
          : "This piece was published before monikers. Only the paper’s editor can change it.",
        403,
      );
    }
    return editWriting(db, id, changes);
  });
}

function mayEdit(
  db: InstanceDb,
  writerId: number | null,
  key: unknown,
  by: { editor: boolean; client?: string },
): boolean {
  return writerId === null ? by.editor : isWritersKey(db, writerId, key, by.client);
}

/** Bylines are fixed at publication; an edit changes only the headline and body. */
function parseWritingChanges(json: unknown): Required<WritingChanges> {
  const fields = asRecord(json);
  return {
    title: requiredText(fields.title, "headline", MAX_TITLE_LENGTH),
    body: requiredBody(fields.body),
  };
}

class InvalidWritingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWritingError";
  }
}

class NotTheWriterError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 = 401,
  ) {
    super(message);
    this.name = "NotTheWriterError";
  }
}

function attempt(save: () => Writing): SaveResult {
  try {
    const writing = save();
    return { ok: true, id: writing.id, url: pieceHref(writing) };
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown): SaveResult {
  if (error instanceof InvalidWritingError) return { ok: false, status: 400, error: error.message };
  if (error instanceof NotTheWriterError) return { ok: false, status: error.status, error: error.message };
  if (error instanceof TooManyAttemptsError) return { ok: false, status: 429, error: error.message };
  if (error instanceof WritingNotFoundError) {
    return { ok: false, status: 404, error: "That writing no longer exists." };
  }
  throw error;
}

function asRecord(json: unknown): Record<string, unknown> {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new InvalidWritingError("The request was not a writing.");
  }
  return json as Record<string, unknown>;
}

function requiredText(value: unknown, name: string, maxLength: number): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (text.length === 0) throw new InvalidWritingError(`Add a ${name} first.`);
  if (text.length > maxLength) {
    throw new InvalidWritingError(`The ${name} is too long: keep it under ${maxLength} characters.`);
  }
  return text;
}

function requiredBody(value: unknown) {
  try {
    const body = normalizeDoc(value);
    if (isBlankDoc(body)) throw new InvalidWritingError("Write something before publishing.");
    return body;
  } catch (error) {
    if (error instanceof InvalidDocumentError) {
      throw new InvalidWritingError("The article body could not be read. Try reloading the editor.");
    }
    throw error;
  }
}

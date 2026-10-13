import type { TiptapDoc } from "@/core/db";

/**
 * Unsaved work, kept in the browser so a reload or a crash loses nothing.
 * One draft per writing: new work shares the "new" slot, each edit has its own.
 */
export interface Draft {
  title: string;
  /** The pen name typed so far, for a writer who has not got one yet. */
  author: string;
  body: TiptapDoc;
  savedAt: number;
  /** For edits: how many edits the writing had when the draft began. */
  baseEdits?: number;
}

export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PREFIX = "broadsheet:draft:";

export function draftKey(writingId: number | null): string {
  return writingId === null ? `${PREFIX}new` : `${PREFIX}w${writingId}`;
}

export function loadDraft(storage: DraftStorage | null, key: string): Draft | null {
  try {
    const value: unknown = JSON.parse(storage?.getItem(key) ?? "null");
    return isDraft(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveDraft(storage: DraftStorage | null, key: string, draft: Draft): void {
  attempt(() => storage?.setItem(key, JSON.stringify(draft)));
}

export function clearDraft(storage: DraftStorage | null, key: string): void {
  attempt(() => storage?.removeItem(key));
}

/** localStorage, or null where the browser blocks it. */
export function browserStorage(): DraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Storage can throw (quota, privacy modes); a lost draft save is not worth an error. */
function attempt<T>(action: () => T): T | undefined {
  try {
    return action();
  } catch {
    return undefined;
  }
}

function isDraft(value: unknown): value is Draft {
  if (typeof value !== "object" || value === null) return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.title === "string" &&
    typeof draft.author === "string" &&
    typeof draft.savedAt === "number" &&
    typeof draft.body === "object" &&
    draft.body !== null &&
    (draft.body as { type?: unknown }).type === "doc"
  );
}

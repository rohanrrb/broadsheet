import type { DraftStorage } from "./draft";

/**
 * Who this browser writes as: a pen name and its key, kept in localStorage so
 * a returning writer is recognised without typing either. Clearing it does not
 * touch the paper; it only makes this browser forget.
 */
export interface Identity {
  name: string;
  key: string;
}

export const IDENTITY_KEY = "broadsheet:writer";

export function parseIdentity(raw: string | null): Identity | null {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    const { name, key } = (value ?? {}) as Record<string, unknown>;
    return typeof name === "string" && typeof key === "string" && name && key ? { name, key } : null;
  } catch {
    return null;
  }
}

export function saveIdentity(storage: DraftStorage | null, identity: Identity): void {
  try {
    storage?.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // A browser that blocks storage simply will not remember the writer.
  }
}

export function clearIdentity(storage: DraftStorage | null): void {
  try {
    storage?.removeItem(IDENTITY_KEY);
  } catch {
    // Nothing to forget.
  }
}

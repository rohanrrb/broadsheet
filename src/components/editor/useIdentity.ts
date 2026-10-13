import { useSyncExternalStore } from "react";
import { browserStorage } from "@/editor/draft";
import { IDENTITY_KEY, clearIdentity, parseIdentity, saveIdentity, type Identity } from "@/editor/identity";

const listeners = new Set<() => void>();
let cached: { raw: string | null; identity: Identity | null } = { raw: null, identity: null };

/** Who this browser writes as, kept in step across tabs; null on the server and for a newcomer. */
export function useIdentity(): Identity | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function rememberIdentity(identity: Identity): void {
  saveIdentity(browserStorage(), identity);
  listeners.forEach((notify) => notify());
}

export function forgetIdentity(): void {
  clearIdentity(browserStorage());
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

/** The same object for the same stored text, as useSyncExternalStore requires. */
function read(): Identity | null {
  let raw: string | null = null;
  try {
    raw = browserStorage()?.getItem(IDENTITY_KEY) ?? null;
  } catch {
    raw = null;
  }
  if (raw !== cached.raw) cached = { raw, identity: parseIdentity(raw) };
  return cached.identity;
}

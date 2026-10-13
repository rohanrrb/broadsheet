import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * The editor's key: the one secret that opens an instance's desk. It comes
 * from one of two places. A host can set it in BROADSHEET_EDITOR_KEY, which
 * always wins (and is how a lost key is replaced). Otherwise the first person
 * to claim a new paper chooses it, and only its hash is kept in the instance
 * database. Until either happens the paper is unclaimed. Signing in with the
 * key opens a session; those are kept in editorSessions.ts.
 */

export const MIN_EDITOR_KEY_LENGTH = 12;

export type EditorAccess =
  | { kind: "host"; key: string }
  | { kind: "claimed"; keyHash: string }
  | { kind: "unclaimed" };

export function editorAccess(
  storedHash: string | null,
  setting: string | undefined = process.env.BROADSHEET_EDITOR_KEY,
): EditorAccess {
  const key = setting?.trim() ?? "";
  if (key.length >= MIN_EDITOR_KEY_LENGTH) return { kind: "host", key };
  return storedHash ? { kind: "claimed", keyHash: storedHash } : { kind: "unclaimed" };
}

/** A salted scrypt hash, as stored: "scrypt:<salt>:<hash>", both hex. */
export function hashKey(key: string, salt: Buffer = randomBytes(16)): string {
  return `scrypt:${salt.toString("hex")}:${scryptSync(key, salt, 32).toString("hex")}`;
}

export function isValidKey(candidate: unknown, access: EditorAccess): boolean {
  if (typeof candidate !== "string") return false;
  const key = candidate.trim();
  if (access.kind === "host") return sameText(key, access.key);
  if (access.kind === "claimed") return matchesHash(key, access.keyHash);
  return false;
}

function matchesHash(key: string, stored: string): boolean {
  const [scheme, salt] = stored.split(":");
  return scheme === "scrypt" && Boolean(salt) && sameText(hashKey(key, Buffer.from(salt, "hex")), stored);
}

/** Constant-time comparison, so a guess learns nothing from how long it took. */
export function sameText(a: string, b: string): boolean {
  const [left, right] = [digest(a), digest(b)];
  return timingSafeEqual(left, right);
}

function digest(text: string): Buffer {
  return createHmac("sha256", "broadsheet-compare").update(text).digest();
}

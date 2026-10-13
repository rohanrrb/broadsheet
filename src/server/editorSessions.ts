import { createHmac, randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import type { InstanceDb } from "@/core/db";
import { editorSessions } from "@/core/db/schema";
import type { EditorAccess } from "./editorKey";

/**
 * The editor's sessions. Signing in makes a random token that goes to the
 * browser and nowhere else; the paper keeps a digest of it, made with the
 * editor's key (for a claimed paper, with that key's stored hash). So a copy
 * of the paper's file opens no desk: the digest cannot be turned back into a
 * token, and without a token it says nothing about the key either. A session
 * ends when it is signed out, when it is a month old, or when the editor's
 * key changes, since its digest can no longer be made.
 */

export const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

/** Opens a session and returns its token, or null while the paper has no editor. */
export function openSession(db: InstanceDb, access: EditorAccess, now: Date = new Date()): string | null {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = digestOf(token, access);
  if (!tokenHash) return null;
  db.delete(editorSessions).where(lt(editorSessions.expiresAt, now)).run();
  db.insert(editorSessions).values({ tokenHash, expiresAt: new Date(now.getTime() + SESSION_MS) }).run();
  return token;
}

/** Whether `token` is a session still open under the editor's present key. */
export function isOpenSession(
  db: InstanceDb,
  token: string | undefined,
  access: EditorAccess,
  now: Date = new Date(),
): boolean {
  const tokenHash = token ? digestOf(token, access) : null;
  if (!tokenHash) return false;
  const session = db.select().from(editorSessions).where(eq(editorSessions.tokenHash, tokenHash)).get();
  return session !== undefined && session.expiresAt > now;
}

export function closeSession(db: InstanceDb, token: string | undefined, access: EditorAccess): void {
  const tokenHash = token ? digestOf(token, access) : null;
  if (tokenHash) db.delete(editorSessions).where(eq(editorSessions.tokenHash, tokenHash)).run();
}

/** Ends every session: for an editor who thinks a browser of theirs is in other hands. */
export function closeAllSessions(db: InstanceDb): void {
  db.delete(editorSessions).run();
}

/**
 * A token as the paper stores it, keyed by the editor's key (or, for a claimed
 * paper, by that key's stored hash). The token is long and random, so the
 * digest gives nothing to guess the key against.
 */
function digestOf(token: string, access: EditorAccess): string | null {
  const secret = access.kind === "host" ? access.key : access.kind === "claimed" ? access.keyHash : null;
  return secret && createHmac("sha256", secret).update(`broadsheet-session:${token}`).digest("hex");
}

import { randomInt } from "node:crypto";
import { getInstanceSettings, setEditorKeyHash, type InstanceDb } from "@/core/db";
import { MIN_EDITOR_KEY_LENGTH, editorAccess, hashKey, sameText } from "./editorKey";

/**
 * Claiming a new paper. A fresh instance has no editor, so the first person
 * to open its desk chooses the key. To make sure that person is whoever
 * deployed it, they must also give a one-time code that broadsheet prints to
 * the server's log, which only the host can read. The code lives in memory:
 * a restart prints a new one, and once the paper is claimed it is never used
 * again.
 */

export type ClaimResult = { ok: true } | { ok: false; status: 400 | 401 | 409; error: string };

/** No 0/O or 1/I/L: the code is read off a log page and typed by hand. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const globalForClaim = globalThis as { broadsheetClaimCode?: string };

/** The claim code for this process, made and printed to the log on first use. */
export function claimCode(): string {
  if (!globalForClaim.broadsheetClaimCode) {
    globalForClaim.broadsheetClaimCode = newCode();
    console.log(
      `[broadsheet] This paper has no editor yet. To claim it, open /desk and enter the code ${globalForClaim.broadsheetClaimCode}`,
    );
  }
  return globalForClaim.broadsheetClaimCode;
}

export function isUnclaimed(db: InstanceDb): boolean {
  return editorAccess(getInstanceSettings(db).editorKeyHash).kind === "unclaimed";
}

/** Sets the editor's key for an unclaimed paper, given the right code. `code` is the one to match. */
export function claimPaper(db: InstanceDb, json: unknown, code: string = claimCode()): ClaimResult {
  if (!isUnclaimed(db)) return { ok: false, status: 409, error: "This paper already has an editor." };
  const { code: given, key } = asFields(json);
  if (!sameText(normalize(given), normalize(code))) {
    return { ok: false, status: 401, error: "That is not the claim code in this paper’s server log." };
  }
  if (key.length < MIN_EDITOR_KEY_LENGTH) {
    return { ok: false, status: 400, error: `Choose an editor key of at least ${MIN_EDITOR_KEY_LENGTH} characters.` };
  }
  setEditorKeyHash(db, hashKey(key));
  return { ok: true };
}

function newCode(): string {
  const letters = Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${letters.slice(0, 5)}-${letters.slice(5)}`;
}

/** Codes are compared without regard to case, dashes or spaces. */
function normalize(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

function asFields(json: unknown): { code: string; key: string } {
  const fields = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  return { code: text(fields.code), key: text(fields.key) };
}

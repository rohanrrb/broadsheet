import { createHash, randomBytes } from "node:crypto";
import type { InstanceDb } from "@/core/db";
import {
  MAX_NAME_LENGTH,
  MIN_NAME_LENGTH,
  NameTakenError,
  createWriter,
  findWriter,
  getWriter,
  handleOf,
  type Writer,
} from "@/core/writers";
import { guarded, isBlocked, limitsFor, recordAttempt, TOO_MANY_ATTEMPTS, UNKNOWN_CLIENT, type Limit } from "./attempts";
import { hashKey, isValidKey } from "./editorKey";
import { fieldOf } from "./fields";
import { WORDS } from "./words";

/**
 * Pen names. A writer is a name and a secret key that broadsheet makes up and
 * shows once. There is nothing else to an account: no email, no password to
 * reset. Whoever holds the key is the writer; a lost key is a lost name.
 */

const KEY_WORDS = 6;
/**
 * What a name may be made of: the letters of any alphabet built on the Latin
 * one (é, ñ, ø, ł, ễ, and the ɛ, ɔ, ɓ and ŋ of West African languages), the
 * digits 0 to 9, spaces, hyphens and underscores. No other script: a byline is
 * the only identity a writer has, and letters from elsewhere that look like
 * these (a Cyrillic "а", a letter that prints as nothing) let one name pass
 * for another. Within these letters, `handleOf` makes the look-alikes collide,
 * and a name is refused unless it folds all the way down to PLAIN_HANDLE: that
 * shuts out the rarer letters the fold has no plain reading for, and names
 * that begin or end with a hyphen or underscore to look like someone else's.
 */
const NAME_PATTERN = /^(?:[A-Za-z0-9_ -]|(?=[\u00C0-\u02AF\u1E00-\u1EFF])[\p{Lu}\p{Ll}])+$/u;

/** A handle of plain words: a to z and digits, joined by single hyphens. */
const PLAIN_HANDLE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Wrong keys allowed in ten minutes from one address, or from everyone when no address is known. */
const WRONG_KEYS = { perAddress: 10, whenUnknown: 60 };
/** New names allowed in ten minutes: from one address (or everyone, unknown), and on the whole paper. */
const NEW_NAMES = { perAddress: 10, whenUnknown: 30, overall: 200 };

export type NewWriterResult =
  | { ok: true; name: string; key: string }
  | { ok: false; status: 400 | 409 | 429; error: string };

/**
 * Makes a writer and their key. A request with no name gets a placeholder
 * derived from the key itself, so nobody has to think of one.
 */
export function registerWriter(db: InstanceDb, json: unknown, client: string = UNKNOWN_CLIENT): NewWriterResult {
  const requested = tidy(fieldOf(json, "name"));
  const problem = requested ? nameProblem(requested) : null;
  if (problem) return { ok: false, status: 400, error: problem };
  // The one count kept for the whole paper: it stops a flood of names from many addresses filling the file.
  const limits = [
    ...limitsFor("new-names", client, NEW_NAMES.perAddress, NEW_NAMES.whenUnknown),
    { key: "new-names", limit: NEW_NAMES.overall },
  ];
  if (isBlocked(limits)) return { ok: false, status: 429, error: TOO_MANY_ATTEMPTS };

  // Every try counts, taken or not, and a taken name is turned away before the slow hash is run for it.
  recordAttempt(limits);
  const key = newKey();
  const free = (requested ? [requested] : placeholderNames(key)).filter((name) => !findWriter(db, name));
  if (free.length === 0) {
    return { ok: false, status: 409, error: requested ? `“${requested}” is taken.` : "No moniker could be made up. Try again." };
  }
  const keyHash = hashKey(key);
  for (const name of free) {
    try {
      createWriter(db, { name, keyHash });
      return { ok: true, name, key };
    } catch (error) {
      // Taken in the moment since it was looked for.
      if (!(error instanceof NameTakenError)) throw error;
    }
  }
  return { ok: false, status: 409, error: `“${requested || free[0]}” is taken.` };
}

/**
 * The writer this name and key belong to, or null if they do not match.
 * Throws TooManyAttemptsError once this `client` has given too many wrong
 * keys in the last ten minutes, whoever they were for.
 */
export function authenticateWriter(
  db: InstanceDb,
  name: unknown,
  key: unknown,
  client: string = UNKNOWN_CLIENT,
): Writer | null {
  const writer = typeof name === "string" ? findWriter(db, name) : undefined;
  return writer && guarded(wrongKeyLimits(client), () => holdsKey(writer, key)) ? writer : null;
}

/** Whether `key` is the key of the writer with this id. Throws like authenticateWriter. */
export function isWritersKey(
  db: InstanceDb,
  writerId: number,
  key: unknown,
  client: string = UNKNOWN_CLIENT,
): boolean {
  const writer = getWriter(db, writerId);
  return writer !== undefined && guarded(wrongKeyLimits(client), () => holdsKey(writer, key));
}

function wrongKeyLimits(client: string): Limit[] {
  return limitsFor("wrong-key", client, WRONG_KEYS.perAddress, WRONG_KEYS.whenUnknown);
}

/** Six random words: easy to write down, impossible to guess. */
export function newKey(bytes: Uint8Array = randomBytes(KEY_WORDS)): string {
  return Array.from(bytes, (byte) => WORDS[byte]).join("-");
}

/**
 * Names for a writer who did not choose one, from a digest of their key:
 * first two words, then the same two with a number, until one is free.
 */
export function placeholderNames(key: string): string[] {
  const digest = createHash("sha256").update(key).digest();
  const base = `${WORDS[digest[0]]}-${WORDS[digest[1]]}`;
  // Two digits at most, so the longest pair of words still fits the length a name may be.
  return [base, ...Array.from({ length: 8 }, (_, i) => `${base}-${digest[2 + i] % 100}`)];
}

const SUGGESTION_TRIES = 8;

/**
 * Two words nobody is writing under, for a newcomer to keep or replace. Nothing
 * is set aside: the name is taken only when someone registers it, so two
 * people may be offered the same one and the first to choose it has it.
 */
export function suggestName(db: InstanceDb, pick: () => Uint8Array = () => randomBytes(2)): string {
  let name = "";
  for (let i = 0; i < SUGGESTION_TRIES; i++) {
    const [first, second] = pick();
    name = `${WORDS[first]}-${WORDS[second]}`;
    if (!findWriter(db, name)) return name;
  }
  return `${name}-${randomBytes(1)[0] % 100}`;
}

function holdsKey(writer: Writer, key: unknown): boolean {
  return isValidKey(normalizeKey(key), { kind: "claimed", keyHash: writer.keyHash });
}

/** Keys are compared without regard to case or to how the words were separated. */
function normalizeKey(key: unknown): unknown {
  return typeof key === "string" ? key.trim().toLowerCase().split(/[\s-]+/).join("-") : key;
}

function nameProblem(name: string): string | null {
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    return `A moniker is ${MIN_NAME_LENGTH} to ${MAX_NAME_LENGTH} characters.`;
  }
  if (!NAME_PATTERN.test(name) || !PLAIN_HANDLE.test(handleOf(name))) {
    return "A moniker can use letters, numbers, spaces, hyphens and underscores.";
  }
  return null;
}

/** The name as it will be kept: one form for each letter (NFKC), single spaces, none at the ends. */
function tidy(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFKC").replace(/\s+/g, " ").trim() : "";
}

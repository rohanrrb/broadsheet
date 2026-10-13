/**
 * A count, kept in memory, of things that must not happen too often: wrong
 * guesses at a credential, the editor's key or the claim code, and new names
 * being taken. Past a limit the paper refuses without doing the work, which is
 * what keeps a flood of guesses from being answered, or from tying up the
 * server in slow hashes. One process owns a paper, so memory is enough; a
 * restart forgets.
 */

/** How long an attempt counts against its limit. */
export const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
/** Past this many things being counted, the oldest are dropped, so the count itself cannot be flooded. */
const MAX_COUNTED = 10_000;

/** A thing being counted, and how many attempts it may have within the window. */
export interface Limit {
  key: string;
  limit: number;
}

export const TOO_MANY_ATTEMPTS = "Too many attempts. Try again in a few minutes.";

export class TooManyAttemptsError extends Error {
  constructor() {
    super(TOO_MANY_ATTEMPTS);
    this.name = "TooManyAttemptsError";
  }
}

/** Whoever is asking, when no proxy says: all such requests are counted together. */
export const UNKNOWN_CLIENT = "unknown";

/**
 * The limits on one kind of attempt by one `client`. An address may make
 * `perAddress` of them in the window. Nothing is counted against the thing
 * being guessed at, a writer or the editor's key, because then anyone could
 * shut its owner out by guessing wrongly on purpose. Only when no address is
 * known do all requests share one count, of `whenUnknown`.
 */
export function limitsFor(kind: string, client: string, perAddress: number, whenUnknown: number): Limit[] {
  return client === UNKNOWN_CLIENT
    ? [{ key: `${kind}:${UNKNOWN_CLIENT}`, limit: whenUnknown }]
    : [{ key: `${kind}:${client}`, limit: perAddress }];
}

const globalForAttempts = globalThis as { broadsheetAttempts?: Map<string, number[]> };
/** One count per server process, kept across dev hot reloads. */
const counted: Map<string, number[]> = (globalForAttempts.broadsheetAttempts ??= new Map());

/** Whether any of these has reached its limit within the window. */
export function isBlocked(limits: readonly Limit[], now: number = Date.now()): boolean {
  return limits.some(({ key, limit }) => recent(key, now).length >= limit);
}

/** Counts one attempt against each of these. */
export function recordAttempt(limits: readonly Limit[], now: number = Date.now()): void {
  for (const { key } of limits) {
    const times = recent(key, now);
    counted.delete(key);
    counted.set(key, [...times, now]);
  }
  if (counted.size > MAX_COUNTED) dropOldest(now);
}

/**
 * Checks a guess at a secret, unless too many have been wrong lately, and
 * counts it if it is wrong too. A right guess costs nothing.
 */
export function guarded(limits: readonly Limit[], check: () => boolean, now: number = Date.now()): boolean {
  if (isBlocked(limits, now)) throw new TooManyAttemptsError();
  const right = check();
  if (!right) recordAttempt(limits, now);
  return right;
}

/** For tests: start counting afresh. */
export function forgetAttempts(): void {
  counted.clear();
}

function recent(key: string, now: number): number[] {
  return (counted.get(key) ?? []).filter((time) => now - time < ATTEMPT_WINDOW_MS);
}

/** Forgets whatever has aged out, then the longest-untouched half of what is left. */
function dropOldest(now: number): void {
  for (const [key, times] of counted) {
    if (times.every((time) => now - time >= ATTEMPT_WINDOW_MS)) counted.delete(key);
  }
  const excess = counted.size - MAX_COUNTED / 2;
  [...counted.keys()].slice(0, Math.max(0, excess)).forEach((key) => counted.delete(key));
}

/**
 * A small in-memory cache for widget data fetched from outside services.
 * Fresh entries are served as is. Past their TTL they are reloaded, with a
 * timeout; if the reload fails, the stale entry is served instead (stale while
 * error). After a failure the cache waits `retryAfterMs` before trying again,
 * so a dead service costs one timeout, not one per page view.
 */

export interface CachePolicy {
  /** How long a loaded value stays fresh. */
  ttlMs: number;
  /** How long a load may take before it counts as failed. */
  timeoutMs: number;
  /** How long to wait after a failure before loading again. */
  retryAfterMs: number;
}

export type Loader<T> = (signal: AbortSignal) => Promise<T>;

export interface TtlCache {
  /**
   * The value for `key`, loading it if needed; undefined when there is none
   * to give. `label` names the entry in failure logs.
   */
  get<T>(key: string, policy: CachePolicy, load: Loader<T>, label?: string): Promise<T | undefined>;
}

interface Entry {
  value?: { data: unknown; storedAt: number };
  failedAt?: number;
  inFlight?: Promise<unknown>;
}

export function createTtlCache(now: () => number = Date.now): TtlCache {
  const entries = new Map<string, Entry>();

  async function get<T>(key: string, policy: CachePolicy, load: Loader<T>, label = key): Promise<T | undefined> {
    const entry = entries.get(key) ?? {};
    entries.set(key, entry);
    const stale = entry.value?.data as T | undefined;
    if (entry.value && now() - entry.value.storedAt < policy.ttlMs) return stale;
    if (entry.failedAt !== undefined && now() - entry.failedAt < policy.retryAfterMs) return stale;
    try {
      return (await reload(entry, policy, load)) as T;
    } catch (error) {
      console.warn(`[widgets] ${label} failed to load: ${messageOf(error)}${stale === undefined ? "" : "; serving stale data"}`);
      return stale;
    }
  }

  function reload(entry: Entry, policy: CachePolicy, load: Loader<unknown>): Promise<unknown> {
    entry.inFlight ??= withTimeout(load, policy.timeoutMs)
      .then((data) => {
        entry.value = { data, storedAt: now() };
        entry.failedAt = undefined;
        return data;
      })
      .catch((error) => {
        entry.failedAt = now();
        throw error;
      })
      .finally(() => {
        entry.inFlight = undefined;
      });
    return entry.inFlight;
  }

  return { get };
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/** Runs `load`, aborting it and rejecting if it takes longer than `ms`. */
export function withTimeout<T>(load: Loader<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(ms));
    }, ms);
    load(controller.signal)
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTtlCache, withTimeout } from "./cache";

const POLICY = { ttlMs: 10_000, timeoutMs: 2_000, retryAfterMs: 30_000 };

describe("TTL cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("serves a fresh value without reloading, and reloads once it expires", async () => {
    const cache = createTtlCache();
    const load = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    expect(await cache.get("k", POLICY, load)).toBe("first");
    vi.advanceTimersByTime(9_999);
    expect(await cache.get("k", POLICY, load)).toBe("first");
    vi.advanceTimersByTime(1);
    expect(await cache.get("k", POLICY, load)).toBe("second");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("serves the stale value when a reload fails", async () => {
    const cache = createTtlCache();
    await cache.get("k", POLICY, async () => "old");
    vi.advanceTimersByTime(POLICY.ttlMs);
    expect(await cache.get("k", POLICY, () => Promise.reject(new Error("down")))).toBe("old");
  });

  it("gives undefined when a load fails with nothing cached", async () => {
    const cache = createTtlCache();
    expect(await cache.get("k", POLICY, () => Promise.reject(new Error("down")))).toBeUndefined();
  });

  it("times out a slow load and aborts it", async () => {
    const cache = createTtlCache();
    let signal: AbortSignal | undefined;
    const pending = cache.get("k", POLICY, (s) => {
      signal = s;
      return new Promise(() => {});
    });
    vi.advanceTimersByTime(POLICY.timeoutMs);
    expect(await pending).toBeUndefined();
    expect(signal?.aborted).toBe(true);
  });

  it("waits before retrying a failed service", async () => {
    const cache = createTtlCache();
    const load = vi.fn().mockRejectedValue(new Error("down"));
    await cache.get("k", POLICY, load);
    await cache.get("k", POLICY, load);
    expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(POLICY.retryAfterMs);
    await cache.get("k", POLICY, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    const cache = createTtlCache();
    const load = vi.fn(async () => "value");
    const [a, b] = await Promise.all([cache.get("k", POLICY, load), cache.get("k", POLICY, load)]);
    expect([a, b]).toEqual(["value", "value"]);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe("withTimeout", () => {
  it("passes through a load that finishes in time", async () => {
    await expect(withTimeout(async () => 7, 1_000)).resolves.toBe(7);
  });
});

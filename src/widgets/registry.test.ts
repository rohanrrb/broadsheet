import { afterEach, describe, expect, it, vi } from "vitest";
import { createTtlCache } from "./cache";
import { DEFAULT_TODAY, parseTodayConfig, readTodayConfig } from "./config";
import { loadWidget, widgetContext } from "./load";
import { resolveWidgets, WIDGETS } from "./registry";
import { defineWidget } from "./widget";

afterEach(() => vi.restoreAllMocks());

const stub = (id: string) =>
  defineWidget<string>({ id, title: id, ttlMs: 1_000, load: async () => `${id} data`, View: () => null });

describe("widget registry", () => {
  it("registers weather and markets with distinct ids", () => {
    const ids = WIDGETS.map((w) => w.id);
    expect(ids).toEqual(["weather", "markets"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves configured ids in order, skipping unknown and repeated ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const registry = [stub("a"), stub("b")];
    expect(resolveWidgets(["b", "nope", "a", "b"], registry).map((w) => w.id)).toEqual(["b", "a"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("nope"));
  });

  it("loads a widget through the cache with its own options", async () => {
    const config = { ...DEFAULT_TODAY, options: { a: { flavor: "plain" } } };
    const context = widgetContext(config, "a", new Date());
    expect(context.options).toEqual({ flavor: "plain" });
    expect(await loadWidget(stub("a"), context, createTtlCache())).toBe("a data");
  });

});

describe("today config", () => {
  it("defaults to New York", () => {
    expect(readTodayConfig(undefined)).toBe(DEFAULT_TODAY);
    expect(DEFAULT_TODAY.location.timeZone).toBe("America/New_York");
  });

  it("reads inline JSON and keeps defaults for what it leaves out", () => {
    const config = readTodayConfig('{"widgets":["markets"]}');
    expect(config.widgets).toEqual(["markets"]);
    expect(config.location).toEqual(DEFAULT_TODAY.location);
  });

  it("ignores an invalid location or time zone", () => {
    const bad = { name: "Nowhere", latitude: 1, longitude: 2, timeZone: "Mars/Olympus" };
    expect(parseTodayConfig({ location: bad }).location).toEqual(DEFAULT_TODAY.location);
    const good = { ...bad, timeZone: "Europe/London" };
    expect(parseTodayConfig({ location: good }).location).toEqual(good);
  });

  it("falls back to defaults on unreadable settings", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(readTodayConfig("{not json")).toBe(DEFAULT_TODAY);
    expect(readTodayConfig("/no/such/file.json")).toBe(DEFAULT_TODAY);
  });
});

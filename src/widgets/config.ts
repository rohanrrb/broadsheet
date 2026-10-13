import { readFileSync } from "node:fs";
import { isFiniteNumber, isObject, isStringArray } from "./guards";

/**
 * Per-instance settings for the front page's "today" strip: where the paper
 * is, and which widgets to show in what order. Kept out of the instance
 * database on purpose: it is deployment configuration, set by whoever runs the
 * instance. Override the New York defaults with BROADSHEET_TODAY, holding either
 * inline JSON or the path to a JSON file, e.g.
 *
 *   BROADSHEET_TODAY='{"location":{"name":"Chicago","latitude":41.88,"longitude":-87.63,
 *     "timeZone":"America/Chicago"},"widgets":["weather"]}'
 */

export interface Location {
  /** Shown as the weather's heading. */
  name: string;
  latitude: number;
  longitude: number;
  /** IANA zone; dates and times are set in it wherever the reader's own zone is not known. */
  timeZone: string;
}

export interface TodayConfig {
  location: Location;
  /** Widget ids, left to right. */
  widgets: string[];
  /** Each widget's own settings, keyed by widget id; the widget validates them. */
  options: Record<string, unknown>;
}

export const DEFAULT_TODAY: TodayConfig = {
  location: { name: "New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" },
  widgets: ["weather", "markets"],
  options: {},
};

/** The instance's config, read once per process. */
export function todayConfig(): TodayConfig {
  cached ??= readTodayConfig(process.env.BROADSHEET_TODAY);
  return cached;
}
let cached: TodayConfig | undefined;

export function readTodayConfig(setting: string | undefined): TodayConfig {
  if (!setting?.trim()) return DEFAULT_TODAY;
  try {
    const text = setting.trim().startsWith("{") ? setting : readFileSync(setting, "utf8");
    return parseTodayConfig(JSON.parse(text));
  } catch (error) {
    console.warn(`[widgets] Ignoring BROADSHEET_TODAY: ${error instanceof Error ? error.message : error}`);
    return DEFAULT_TODAY;
  }
}

/** Lays whatever valid fields `raw` has over the defaults; invalid ones are ignored. */
export function parseTodayConfig(raw: unknown): TodayConfig {
  const input = isObject(raw) ? raw : {};
  return {
    location: parseLocation(input.location),
    widgets: isStringArray(input.widgets) ? input.widgets : DEFAULT_TODAY.widgets,
    options: isObject(input.options) ? input.options : DEFAULT_TODAY.options,
  };
}

function parseLocation(raw: unknown): Location {
  const fallback = DEFAULT_TODAY.location;
  if (!isObject(raw)) return fallback;
  const { name, latitude, longitude, timeZone } = raw;
  const valid =
    typeof name === "string" &&
    isFiniteNumber(latitude) &&
    isFiniteNumber(longitude) &&
    typeof timeZone === "string" &&
    isTimeZone(timeZone);
  return valid ? { name, latitude, longitude, timeZone } : fallback;
}

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

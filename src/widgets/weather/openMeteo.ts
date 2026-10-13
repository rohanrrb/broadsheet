import { isFiniteNumber, isObject } from "../guards";

/** Today's weather at one place, in the units asked for. */
export interface WeatherReport {
  temperature: number;
  high: number;
  low: number;
  /** Highest chance of precipitation today, in percent; null if not reported. */
  precipitationChance: number | null;
  /** WMO weather code for the current conditions. */
  code: number;
  isDay: boolean;
  unit: "F" | "C";
}

export type TemperatureUnit = "fahrenheit" | "celsius";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

/** A point on the map to report the weather for. */
export interface Place {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Open-Meteo's free, keyless forecast API, asked for today at every place in
 * one request, each in its own time zone.
 */
export function openMeteoUrl(places: readonly Place[], unit: TemperatureUnit): string {
  const params = new URLSearchParams({
    latitude: places.map((p) => p.latitude).join(","),
    longitude: places.map((p) => p.longitude).join(","),
    current: "temperature_2m,weather_code,is_day",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: unit,
    timezone: "auto",
    forecast_days: "1",
  });
  return `${ENDPOINT}?${params}`;
}

/** Reads a response for several places (a list) or for one (a single forecast), in the order asked. */
export function parseOpenMeteoAll(json: unknown): WeatherReport[] {
  return Array.isArray(json) ? json.map(parseOpenMeteo) : [parseOpenMeteo(json)];
}

/** Reads one Open-Meteo forecast; throws if a required field is missing. */
export function parseOpenMeteo(json: unknown): WeatherReport {
  const body = objectAt(json, "response");
  const current = objectAt(body.current, "current");
  const daily = objectAt(body.daily, "daily");
  const unitLabel = isObject(body.current_units) ? body.current_units.temperature_2m : undefined;
  const chance = first(daily.precipitation_probability_max);
  return {
    temperature: numberAt(current.temperature_2m, "current temperature"),
    high: numberAt(first(daily.temperature_2m_max), "high"),
    low: numberAt(first(daily.temperature_2m_min), "low"),
    precipitationChance: isFiniteNumber(chance) ? chance : null,
    code: numberAt(current.weather_code, "weather code"),
    isDay: current.is_day !== 0,
    unit: unitLabel === "°C" ? "C" : "F",
  };
}

function objectAt(value: unknown, what: string): Record<string, unknown> {
  if (!isObject(value)) throw new Error(`Open-Meteo: missing ${what}`);
  return value;
}

function numberAt(value: unknown, what: string): number {
  if (!isFiniteNumber(value)) throw new Error(`Open-Meteo: missing ${what}`);
  return value;
}

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
}

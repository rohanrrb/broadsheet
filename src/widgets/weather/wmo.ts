/**
 * Plain-English conditions for WMO weather interpretation codes (WW), as
 * Open-Meteo reports them. Labels are short enough for a newspaper ear.
 * https://open-meteo.com/en/docs#weathervariables
 */
const CONDITIONS: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorms",
  96: "Storms, hail",
  99: "Storms, hail",
};

/** By day, a clear sky is sunny. */
const DAYTIME: Record<number, string> = {
  0: "Sunny",
  1: "Mostly sunny",
};

/** The condition for a WMO code, or null for a code outside the table. */
export function describeWeather(code: number, isDay = true): string | null {
  return (isDay ? DAYTIME[code] : undefined) ?? CONDITIONS[code] ?? null;
}

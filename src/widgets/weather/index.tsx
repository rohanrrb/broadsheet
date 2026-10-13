import { isFiniteNumber, isObject } from "../guards";
import { fetchJson } from "../http";
import { defineWidget, type WidgetContext } from "../widget";
import { openMeteoUrl, parseOpenMeteoAll, type Place, type TemperatureUnit, type WeatherReport } from "./openMeteo";
import { describeWeather } from "./wmo";
import shared from "../widget.module.css";
import styles from "./Weather.module.css";

interface CityWeather {
  name: string;
  report: WeatherReport;
}

/**
 * The temperature now in the paper's city, then in any other cities the
 * instance lists, from Open-Meteo. One request covers them all.
 */
export const weather = defineWidget<CityWeather[]>({
  id: "weather",
  title: "Weather",
  ttlMs: 10 * 60_000,
  async load({ location, options }, signal) {
    const places = [location, ...citiesOf(options)];
    const reports = parseOpenMeteoAll(await fetchJson(openMeteoUrl(places, unitOf(options)), signal));
    return places.flatMap((place, i) => (reports[i] ? [{ name: place.name, report: reports[i] }] : []));
  },
  View: WeatherView,
});

/** Options: `{ "unit": "celsius" }`; Fahrenheit otherwise. */
function unitOf(options: unknown): TemperatureUnit {
  return isObject(options) && options.unit === "celsius" ? "celsius" : "fahrenheit";
}

/** Options: `{ "cities": [{ "name": "London", "latitude": 51.51, "longitude": -0.13 }] }`; invalid entries are skipped. */
export function citiesOf(options: unknown): Place[] {
  const cities = isObject(options) && Array.isArray(options.cities) ? options.cities : [];
  return cities.filter(isPlace).map(({ name, latitude, longitude }) => ({ name, latitude, longitude }));
}

function isPlace(value: unknown): value is Place {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude)
  );
}

/** "NYC 76°  LONDON 58°  TOKYO 70°", on one line; the rest of each report is its tooltip. */
function WeatherView({ data }: { data: CityWeather[]; context: WidgetContext }) {
  return (
    <span className={shared.widget}>
      {data.map(({ name, report }) => (
        <span key={name} className={styles.city} title={summaryOf(report)}>
          {name} <span className={styles.temperature}>{degrees(report.temperature)}</span>
        </span>
      ))}
    </span>
  );
}

/** "Mostly sunny, high 76°, low 56°". */
export function summaryOf(report: WeatherReport): string {
  const condition = describeWeather(report.code, report.isDay);
  const range = `high ${degrees(report.high)}, low ${degrees(report.low)}`;
  return condition ? `${condition}, ${range}` : range;
}

function degrees(value: number): string {
  return `${Math.round(value)}°`;
}

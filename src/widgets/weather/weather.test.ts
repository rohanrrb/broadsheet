import { describe, expect, it } from "vitest";
import { DEFAULT_TODAY } from "../config";
import fixture from "../fixtures/open-meteo.json";
import { citiesOf, summaryOf } from "./index";
import { openMeteoUrl, parseOpenMeteo, parseOpenMeteoAll } from "./openMeteo";
import { describeWeather } from "./wmo";

describe("describeWeather", () => {
  it("names WMO codes in short newspaper words", () => {
    expect(describeWeather(3)).toBe("Cloudy");
    expect(describeWeather(63)).toBe("Rain");
    expect(describeWeather(95)).toBe("Thunderstorms");
    expect(describeWeather(45)).toBe("Fog");
  });

  it("calls a clear sky sunny only by day", () => {
    expect(describeWeather(0, true)).toBe("Sunny");
    expect(describeWeather(0, false)).toBe("Clear");
    expect(describeWeather(2, false)).toBe("Partly cloudy");
  });

  it("returns null for codes outside the table", () => {
    expect(describeWeather(42)).toBeNull();
  });
});

describe("Open-Meteo", () => {
  it("asks for today at every place at once, each in its own time zone", () => {
    const london = { name: "London", latitude: 51.5, longitude: -0.13 };
    const url = new URL(openMeteoUrl([DEFAULT_TODAY.location, london], "celsius"));
    expect(url.searchParams.get("timezone")).toBe("auto");
    expect(url.searchParams.get("temperature_unit")).toBe("celsius");
    expect(url.searchParams.get("latitude")).toBe("40.7128,51.5");
    expect(url.searchParams.get("longitude")).toBe("-74.006,-0.13");
  });

  it("reads one forecast or a list of them", () => {
    expect(parseOpenMeteoAll(fixture)).toHaveLength(1);
    expect(parseOpenMeteoAll([fixture, fixture]).map((r) => r.temperature)).toEqual([55.5, 55.5]);
  });

  it("parses a recorded response", () => {
    expect(parseOpenMeteo(fixture)).toEqual({
      temperature: 55.5,
      high: 59.8,
      low: 55.2,
      precipitationChance: 75,
      code: 63,
      isDay: false,
      unit: "F",
    });
  });

  it("tolerates a missing precipitation chance", () => {
    const daily = { ...fixture.daily, precipitation_probability_max: [null] };
    expect(parseOpenMeteo({ ...fixture, daily }).precipitationChance).toBeNull();
  });

  it("throws on a response without the figures it needs", () => {
    expect(() => parseOpenMeteo({ error: true, reason: "bad" })).toThrow(/Open-Meteo/);
    expect(() => parseOpenMeteo({ ...fixture, current: { weather_code: 1 } })).toThrow(/temperature/);
  });
});

describe("weather options", () => {
  it("takes the extra cities an instance lists, skipping malformed ones", () => {
    const options = {
      cities: [
        { name: "London", latitude: 51.5, longitude: -0.13, extra: true },
        { name: "", latitude: 1, longitude: 1 },
        { name: "Nowhere", latitude: "north" },
        "Paris",
      ],
    };
    expect(citiesOf(options)).toEqual([{ name: "London", latitude: 51.5, longitude: -0.13 }]);
    expect(citiesOf(undefined)).toEqual([]);
  });

  it("sums a report up for the tooltip", () => {
    expect(summaryOf(parseOpenMeteo(fixture))).toBe("Rain, high 60°, low 55°");
  });
});

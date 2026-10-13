import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_TODAY } from "../config";
import gspc from "../fixtures/yahoo-gspc.json";
import tnx from "../fixtures/yahoo-tnx.json";
import type { WidgetContext } from "../widget";
import { formatMove, marketOptions, markets, sessionNote } from "./index";
import { allThatLoad, type Quote } from "./provider";
import { parseYahooChart, yahooProvider } from "./yahoo";

const SPX = { symbol: "^GSPC", label: "S&P 500" };
const TEN_YEAR = { symbol: "^TNX", label: "10-Yr Yield", isYield: true };
/** Saturday evening in New York, the day after the recorded Friday session. */
const SATURDAY = new Date("2026-09-26T21:00:00-04:00");
/** Friday 1:00 PM in New York, inside the recorded regular session. */
const FRIDAY_MIDDAY = new Date("2026-09-25T13:00:00-04:00");

describe("parseYahooChart", () => {
  it("reads last, change from the previous close, and percent change", () => {
    const quote = parseYahooChart(gspc, SPX, SATURDAY);
    expect(quote).toMatchObject({ symbol: "^GSPC", label: "S&P 500", last: 7743.41, isYield: false });
    expect(quote.change).toBeCloseTo(39.28, 2);
    expect(quote.changePercent).toBeCloseTo(0.51, 2);
    expect(quote.asOf).toBe("2026-09-25T20:39:57.000Z");
  });

  it("knows whether the regular session is on", () => {
    expect(parseYahooChart(gspc, SPX, SATURDAY).isOpen).toBe(false);
    expect(parseYahooChart(gspc, SPX, FRIDAY_MIDDAY).isOpen).toBe(true);
  });

  it("throws on an error payload", () => {
    const error = { chart: { result: null, error: { code: "Not Found" } } };
    expect(() => parseYahooChart(error, SPX, SATURDAY)).toThrow(/Yahoo/);
  });
});

describe("allThatLoad", () => {
  it("keeps the quotes that load and fails only when none do", async () => {
    await expect(allThatLoad([Promise.resolve(1), Promise.reject(new Error("x"))])).resolves.toEqual([1]);
    await expect(allThatLoad([Promise.reject(new Error("down"))])).rejects.toThrow("down");
  });
});

describe("markets widget", () => {
  const spx = parseYahooChart(gspc, SPX, SATURDAY);
  const tenYear = parseYahooChart(tnx, TEN_YEAR, SATURDAY);
  const context = (now: Date): WidgetContext => ({ location: DEFAULT_TODAY.location, options: undefined, now });

  it("shows only the move: percent for an index, basis points for a yield", () => {
    expect(formatMove(spx)).toBe("0.51%");
    expect(formatMove(tenYear)).toBe("2.2 bp");
    const down: Quote = { ...spx, change: -12.5, changePercent: -0.164 };
    expect(formatMove(down)).toBe("0.16%");
  });

  it("notes the session in the paper's time zone", () => {
    expect(sessionNote([spx], context(SATURDAY))).toBe("At Friday’s close");
    expect(sessionNote([spx], context(new Date("2026-09-25T18:00:00-04:00")))).toBe("At close");
    const open = { ...spx, isOpen: true };
    expect(sessionNote([open], context(FRIDAY_MIDDAY))).toBe("As of 4:39 PM EDT");
    expect(sessionNote([], context(SATURDAY))).toBeUndefined();
  });

  it("defaults to the provider's symbols and accepts custom ones", () => {
    expect(marketOptions(undefined).symbols).toBe(yahooProvider.defaultSymbols);
    const custom = marketOptions({ symbols: [{ symbol: "BTC-USD", label: "Bitcoin" }, { bad: 1 }] });
    expect(custom.symbols).toEqual([{ symbol: "BTC-USD", label: "Bitcoin" }]);
    expect(custom.provider).toBe(yahooProvider);
  });

  it("renders labels, arrows, and moves, never the level", () => {
    const html = renderToStaticMarkup(markets.render([spx, tenYear], context(SATURDAY)));
    expect(html).toContain("S&amp;P 500");
    expect(html).toContain("0.51%");
    expect(html).toContain("2.2 bp");
    expect(html).toContain('aria-label="up"');
    expect(html).toContain("At Friday’s close");
    expect(html).not.toContain("7,743");
    expect(html).not.toContain("5.184");
  });
});

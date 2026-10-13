import { isFiniteNumber, isObject } from "../guards";
import { fetchJson } from "../http";
import { allThatLoad, type MarketSymbol, type MarketsProvider, type Quote } from "./provider";

/**
 * Yahoo Finance's public chart endpoint: keyless, one request per symbol.
 * It is unofficial and rate-limits requests without a browser-like
 * User-Agent, which is one reason providers are swappable.
 */
export const yahooProvider: MarketsProvider = {
  id: "yahoo",
  defaultSymbols: [
    { symbol: "^GSPC", label: "S&P 500" },
    { symbol: "^DJI", label: "Dow" },
    { symbol: "^IXIC", label: "Nasdaq" },
    { symbol: "^TNX", label: "10-Yr Yield", isYield: true },
  ],
  async quotes(symbols, signal, now) {
    return allThatLoad(symbols.map((s) => fetchQuote(s, signal, now)));
  },
};

const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; broadsheet/0.1)" };

async function fetchQuote(symbol: MarketSymbol, signal: AbortSignal, now: Date): Promise<Quote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.symbol)}?range=1d&interval=1d`;
  return parseYahooChart(await fetchJson(url, signal, HEADERS), symbol, now);
}

/** Reads one chart response's `meta` into a quote; throws if a figure is missing. */
export function parseYahooChart(json: unknown, symbol: MarketSymbol, now: Date): Quote {
  const meta = metaOf(json);
  const last = numberAt(meta.regularMarketPrice, "price");
  const previous = numberAt(meta.previousClose ?? meta.chartPreviousClose, "previous close");
  const tradedAt = numberAt(meta.regularMarketTime, "market time");
  return {
    symbol: symbol.symbol,
    label: symbol.label,
    isYield: Boolean(symbol.isYield),
    last,
    change: last - previous,
    changePercent: previous === 0 ? 0 : ((last - previous) / previous) * 100,
    asOf: new Date(tradedAt * 1000).toISOString(),
    isOpen: inRegularSession(meta.currentTradingPeriod, now),
  };
}

function metaOf(json: unknown): Record<string, unknown> {
  const chart = isObject(json) && isObject(json.chart) ? json.chart : null;
  const result = chart && Array.isArray(chart.result) ? chart.result[0] : null;
  if (!isObject(result) || !isObject(result.meta)) throw new Error("Yahoo: no chart data");
  return result.meta;
}

function inRegularSession(period: unknown, now: Date): boolean {
  const regular = isObject(period) && isObject(period.regular) ? period.regular : null;
  if (!regular || !isFiniteNumber(regular.start) || !isFiniteNumber(regular.end)) return false;
  const seconds = now.getTime() / 1000;
  return seconds >= regular.start && seconds < regular.end;
}

function numberAt(value: unknown, what: string): number {
  if (!isFiniteNumber(value)) throw new Error(`Yahoo: missing ${what}`);
  return value;
}

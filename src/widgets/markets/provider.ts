/**
 * Where market numbers come from. Providers are swappable: each one knows its
 * own ticker symbols, so it also supplies the default list.
 */

export interface MarketSymbol {
  /** The provider's ticker, e.g. "^GSPC". */
  symbol: string;
  /** What readers see, e.g. "S&P 500". */
  label: string;
  /** Quoted as a yield in percent (the 10-year note), not a price. */
  isYield?: boolean;
}

export interface Quote {
  symbol: string;
  label: string;
  isYield: boolean;
  last: number;
  /** Change from the previous close, in the quote's own units. */
  change: number;
  changePercent: number;
  /** ISO time of the last trade. */
  asOf: string;
  /** Whether the market is in its regular session right now. */
  isOpen: boolean;
}

export interface MarketsProvider {
  id: string;
  defaultSymbols: readonly MarketSymbol[];
  /** Quotes for as many symbols as it can get; throws only if it gets none. */
  quotes(symbols: readonly MarketSymbol[], signal: AbortSignal, now: Date): Promise<Quote[]>;
}

/** Settles every request and keeps what succeeded; fails only when all of them fail. */
export async function allThatLoad<T>(requests: Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(requests);
  const loaded = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const failure = results.find((r) => r.status === "rejected");
  if (loaded.length === 0 && failure) throw failure.reason;
  return loaded;
}

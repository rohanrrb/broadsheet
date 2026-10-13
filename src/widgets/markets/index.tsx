import { isObject } from "../guards";
import { formatClock, formatWeekday, sameDay } from "../time";
import { defineWidget, type WidgetContext } from "../widget";
import type { MarketSymbol, MarketsProvider, Quote } from "./provider";
import { yahooProvider } from "./yahoo";
import shared from "../widget.module.css";
import styles from "./Markets.module.css";

const PROVIDERS: Record<string, MarketsProvider> = {
  [yahooProvider.id]: yahooProvider,
};

/** How major indexes and the 10-year yield moved today; movement only, no levels. */
export const markets = defineWidget<Quote[]>({
  id: "markets",
  title: "Markets",
  ttlMs: 5 * 60_000,
  load({ options, now }, signal) {
    const { provider, symbols } = marketOptions(options);
    return provider.quotes(symbols, signal, now);
  },
  View: MarketsView,
});

/** Options: `{ "provider": "yahoo", "symbols": [{ "symbol": "^GSPC", "label": "S&P 500" }] }`. */
export function marketOptions(options: unknown): { provider: MarketsProvider; symbols: readonly MarketSymbol[] } {
  const raw = isObject(options) ? options : {};
  const provider = PROVIDERS[String(raw.provider)] ?? yahooProvider;
  const symbols = Array.isArray(raw.symbols) ? raw.symbols.filter(isMarketSymbol) : [];
  return { provider, symbols: symbols.length > 0 ? symbols : provider.defaultSymbols };
}

function isMarketSymbol(value: unknown): value is MarketSymbol {
  return isObject(value) && typeof value.symbol === "string" && typeof value.label === "string";
}

function MarketsView({ data, context }: { data: Quote[]; context: WidgetContext }) {
  return (
    <span className={shared.widget} title={sessionNote(data, context)}>
      {data.map((quote) => (
        <QuoteItem key={quote.symbol} quote={quote} />
      ))}
    </span>
  );
}

function QuoteItem({ quote }: { quote: Quote }) {
  const direction = directionOf(quote);
  return (
    <span className={styles.quote}>
      {quote.label}{" "}
      <span className={styles.move} data-direction={direction}>
        <span className={styles.arrow} aria-label={SPOKEN[direction]}>
          {ARROWS[direction]}
        </span>
        {formatMove(quote)}
      </span>
    </span>
  );
}

type Direction = "up" | "down" | "flat";

const ARROWS: Record<Direction, string> = { up: "▲", down: "▼", flat: "▪" };
const SPOKEN: Record<Direction, string> = { up: "up", down: "down", flat: "unchanged" };

function directionOf(quote: Quote): Direction {
  if (quote.change === 0) return "flat";
  return quote.change > 0 ? "up" : "down";
}

/** "At close", "At Friday's close", or "As of 2:41 PM EDT", from the first quote: the ticker's tooltip. */
export function sessionNote(quotes: readonly Quote[], { now, location }: WidgetContext): string | undefined {
  const lead = quotes[0];
  if (!lead) return undefined;
  const asOf = new Date(lead.asOf);
  if (lead.isOpen) return `As of ${formatClock(asOf, location.timeZone)}`;
  if (sameDay(asOf, now, location.timeZone)) return "At close";
  return `At ${formatWeekday(asOf, location.timeZone)}’s close`;
}

/**
 * The day's move, unsigned (the arrow carries the direction): "0.51%" for an
 * index; a yield's percent change means little, so it moves in basis points,
 * "2.2 bp".
 */
export function formatMove(quote: Quote): string {
  if (quote.isYield) return `${formatNumber(Math.abs(quote.change) * 100, 1)} bp`;
  return `${formatNumber(Math.abs(quote.changePercent), 2)}%`;
}

function formatNumber(value: number, digits: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

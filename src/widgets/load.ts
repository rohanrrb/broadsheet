import { createTtlCache, type CachePolicy, type TtlCache } from "./cache";
import type { TodayConfig } from "./config";
import type { RegisteredWidget, WidgetContext } from "./widget";

/** A slow service must not hold up the front page for long. */
export const WIDGET_TIMEOUT_MS = 2_000;
/** After a failure, serve stale data (or nothing) this long before trying again. */
export const WIDGET_RETRY_MS = 60_000;

const globalForWidgets = globalThis as { broadsheetWidgetCache?: TtlCache };

/** One cache per server process, kept across dev hot reloads. */
function sharedCache(): TtlCache {
  globalForWidgets.broadsheetWidgetCache ??= createTtlCache();
  return globalForWidgets.broadsheetWidgetCache;
}

export function widgetContext(config: TodayConfig, widgetId: string, now: Date): WidgetContext {
  return { location: config.location, options: config.options[widgetId], now };
}

/** The widget's data, fresh or stale; undefined when it has never loaded. */
export function loadWidget(
  widget: RegisteredWidget,
  context: WidgetContext,
  cache: TtlCache = sharedCache(),
): Promise<unknown> {
  const policy: CachePolicy = { ttlMs: widget.ttlMs, timeoutMs: WIDGET_TIMEOUT_MS, retryAfterMs: WIDGET_RETRY_MS };
  const key = `${widget.id}:${JSON.stringify([context.location, context.options])}`;
  return cache.get(key, policy, (signal) => widget.load(context, signal), widget.id);
}

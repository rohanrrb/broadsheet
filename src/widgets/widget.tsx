import type { ReactNode } from "react";
import type { Location } from "./config";

/** What a widget knows when it loads and renders. */
export interface WidgetContext {
  location: Location;
  /** This widget's entry in the config's `options`, unvalidated. */
  options: unknown;
  /** The time the page is set; widgets format it in `location.timeZone`. */
  now: Date;
}

/**
 * One entry in the front page's "today" strip, a single line of type. `load`
 * fetches live data on the server (it is cached, timed out, and retried for
 * the widget); `View` sets it inline. A widget that cannot load shows only its
 * title and a dash.
 */
export interface Widget<Data> {
  id: string;
  /** A short label, shown while loading or when there is nothing to show. */
  title: string;
  /** How long loaded data stays fresh. */
  ttlMs: number;
  load(context: WidgetContext, signal: AbortSignal): Promise<Data>;
  View(props: { data: Data; context: WidgetContext }): ReactNode;
}

/** A widget with its data type sealed in, so different widgets share one registry. */
export interface RegisteredWidget {
  id: string;
  title: string;
  ttlMs: number;
  load(context: WidgetContext, signal: AbortSignal): Promise<unknown>;
  render(data: unknown, context: WidgetContext): ReactNode;
}

export function defineWidget<Data>(widget: Widget<Data>): RegisteredWidget {
  const { View } = widget;
  return {
    id: widget.id,
    title: widget.title,
    ttlMs: widget.ttlMs,
    load: (context, signal) => widget.load(context, signal),
    // Data reaching render always came from this widget's own load.
    render: (data, context) => <View data={data as Data} context={context} />,
  };
}

import { Suspense } from "react";
import type { TodayConfig } from "@/widgets/config";
import { WidgetPlaceholder } from "@/widgets/Heading";
import { loadWidget, widgetContext } from "@/widgets/load";
import { resolveWidgets } from "@/widgets/registry";
import type { RegisteredWidget, WidgetContext } from "@/widgets/widget";
import styles from "./TodayStrip.module.css";

/**
 * The strip above the nameplate: one line of type, a ticker of live widgets
 * such as weather and markets. Each one streams in behind its own Suspense
 * boundary, so a slow service never holds up the paper; a failed one shows its
 * title and a dash. Where the line is longer than the screen it scrolls sideways.
 */
export function TodayStrip({ config, now }: { config: TodayConfig; now: Date }) {
  const widgets = resolveWidgets(config.widgets);
  if (widgets.length === 0) return null;
  return (
    <section className={styles.strip} aria-label="Today">
      {widgets.map((widget) => (
        <div key={widget.id} className={styles.slot} data-widget={widget.id}>
          <Suspense fallback={<WidgetPlaceholder title={widget.title} busy />}>
            <LiveWidget widget={widget} context={widgetContext(config, widget.id, now)} />
          </Suspense>
        </div>
      ))}
    </section>
  );
}

async function LiveWidget({ widget, context }: { widget: RegisteredWidget; context: WidgetContext }) {
  const data = await loadWidget(widget, context);
  if (data === undefined) return <WidgetPlaceholder title={widget.title} />;
  return widget.render(data, context);
}

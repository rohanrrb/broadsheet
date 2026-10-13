import { markets } from "./markets";
import { weather } from "./weather";
import type { RegisteredWidget } from "./widget";

/**
 * Every widget the "today" strip can show. To add one, give it a folder
 * exporting a `defineWidget(...)` and list it here; instances opt in by id.
 */
export const WIDGETS: readonly RegisteredWidget[] = [weather, markets];

/** The widgets for these ids, in order; unknown and repeated ids are skipped. */
export function resolveWidgets(
  ids: readonly string[],
  registry: readonly RegisteredWidget[] = WIDGETS,
): RegisteredWidget[] {
  const byId = new Map(registry.map((w) => [w.id, w]));
  const unknown = ids.filter((id) => !byId.has(id));
  if (unknown.length > 0) console.warn(`[widgets] Unknown widget ids: ${unknown.join(", ")}`);
  return [...new Set(ids)].flatMap((id) => byId.get(id) ?? []);
}

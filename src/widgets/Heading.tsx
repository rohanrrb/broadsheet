import styles from "./widget.module.css";

/** The bold small-caps label that opens each widget, e.g. the city or "Markets". */
export function WidgetLabel({ children, title }: { children: string; title?: string }) {
  return (
    <span className={styles.label} title={title}>
      {children}
    </span>
  );
}

/** What a widget shows while it loads, or when it has nothing to show. */
export function WidgetPlaceholder({ title, busy = false }: { title: string; busy?: boolean }) {
  return (
    <span className={styles.widget} aria-busy={busy || undefined}>
      <WidgetLabel>{title}</WidgetLabel>
      <span className={styles.dash} aria-label={busy ? "Loading" : "Unavailable"}>
        —
      </span>
    </span>
  );
}

import styles from "./SearchBar.module.css";

/**
 * A magnifying glass and the word "Search…": a plain form that asks /search,
 * so it works without scripts. `centered` sets it in the middle of its box,
 * as it sits above the cover story.
 */
export function SearchBar({ query = "", centered = false }: { query?: string; centered?: boolean }) {
  return (
    <form action="/search" role="search" className={centered ? `${styles.search} ${styles.centered}` : styles.search}>
      <label className={styles.field}>
        <svg className={styles.icon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" strokeLinecap="round" />
        </svg>
        <input
          className={styles.input}
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search…"
          aria-label="Search the paper"
          autoComplete="off"
        />
      </label>
    </form>
  );
}

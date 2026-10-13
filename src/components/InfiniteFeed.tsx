"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedView } from "@/feed/feed";
import { PageSheet } from "./PageSheet";
import { PageFolio } from "./Masthead";
import styles from "./InfiniteFeed.module.css";

interface InfiniteFeedProps {
  name: string;
  /** The paper's time zone, for the folio dates. */
  timeZone: string;
  initialCursor: string | null;
}

type Status = "idle" | "loading" | "error";

/** Start fetching the next page this far before the reader reaches the end. */
const PREFETCH_MARGIN = "1200px 0px";

/** Appends later feed pages as the reader nears the bottom. */
export function InfiniteFeed({ name, timeZone, initialCursor }: InfiniteFeedProps) {
  const { pages, cursor, status, loadMore } = useFeedPages(initialCursor);
  const sentinel = useNearViewport(loadMore);
  const [today] = useState(() => new Date());

  return (
    <>
      {pages.map((page) => (
        <section key={page.index} aria-label={`Page ${page.index + 1}`}>
          <PageFolio name={name} index={page.index} today={today} timeZone={timeZone} />
          <PageSheet page={page} />
        </section>
      ))}
      {cursor ? (
        <div ref={sentinel} className={styles.status} aria-live="polite">
          {status === "error" ? (
            <button type="button" className={styles.retry} onClick={loadMore}>
              Couldn’t load more. Try again
            </button>
          ) : (
            <span>Setting the next page…</span>
          )}
        </div>
      ) : (
        <p className={styles.end}>— 30 —</p>
      )}
    </>
  );
}

function useFeedPages(initialCursor: string | null) {
  const [pages, setPages] = useState<FeedView[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [status, setStatus] = useState<Status>("idle");
  const inFlight = useRef(false);

  const loadMore = useCallback(async () => {
    if (!cursor || inFlight.current) return;
    inFlight.current = true;
    setStatus("loading");
    try {
      const page = await fetchFeedPage(cursor);
      setPages((previous) => [...previous, page]);
      setCursor(page.nextCursor);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [cursor]);

  return { pages, cursor, status, loadMore };
}

async function fetchFeedPage(cursor: string): Promise<FeedView> {
  const response = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`);
  if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
  return response.json();
}

/**
 * Calls `onNear` whenever the returned ref's element comes within
 * PREFETCH_MARGIN of the viewport. Re-subscribing after each load re-checks
 * the element, so a short page that leaves it visible keeps loading.
 */
function useNearViewport(onNear: () => void) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && onNear(),
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, onNear]);
  return setElement;
}

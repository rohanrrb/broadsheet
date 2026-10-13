"use client";

import { useEffect, useState } from "react";

interface PaperClockProps {
  /** When the page was set. */
  date: Date;
  /** The paper's own zone, used until the reader's is known. */
  timeZone: string;
}

/**
 * The reader's own local time, "3:27 PM EDT", kept current while the page is
 * open. Only the browser knows the reader's zone, so the server prints the
 * time where the paper is, and the browser corrects it: for a reader in the
 * paper's zone nothing changes, and the clock is there from the first paint.
 */
export function PaperClock({ date, timeZone }: PaperClockProps) {
  const [readerNow, setReaderNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setReaderNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  // Once the browser has spoken, no zone is passed and its own is used.
  const [shown, zone] = readerNow ? [readerNow, undefined] : [date, timeZone];
  return (
    // Server and browser may spell a zone or a space differently; the browser's reading stands.
    <time dateTime={shown.toISOString()} suppressHydrationWarning>
      {shown.toLocaleTimeString("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
    </time>
  );
}

"use client";

import { useEffect, useState } from "react";
import { formatLongDate } from "./format";
import styles from "./RunningHead.module.css";

interface PaperDateProps {
  /** When the page was set. */
  date: Date;
  /** The paper's own zone, used until the reader's is known. */
  timeZone: string;
}

/**
 * Today's date where the reader is: in full on wide screens, abbreviated on
 * phones. The server can only print the paper's date, so that is shown first
 * and corrected in the browser, which for most readers changes nothing.
 */
export function PaperDate({ date, timeZone }: PaperDateProps) {
  const [readerNow, setReaderNow] = useState<Date | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setReaderNow(new Date()), 0);
    return () => clearTimeout(timer);
  }, []);

  // Once the browser has spoken, no zone is passed and its own is used.
  const [shown, zone] = readerNow ? [readerNow, undefined] : [date, timeZone];
  const short = shown.toLocaleDateString("en-US", { timeZone: zone, month: "short", day: "numeric", year: "numeric" });
  return (
    <>
      <span className={styles.longDate}>{formatLongDate(shown, zone)}</span>
      <span className={styles.shortDate}>{short}</span>
    </>
  );
}

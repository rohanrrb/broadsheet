import Link from "next/link";
import type { Notice } from "@/core/notices";
import styles from "./BulletinLine.module.css";

interface BulletinLineProps {
  /** The board's notices, newest first. */
  notices: Notice[];
  /** The paper's time zone, in which each notice is dated. */
  timeZone: string;
  /** Where the whole bulletin is. */
  href: string;
}

/**
 * The line above the nameplate: the word "Bulletin", then its notices,
 * each after its date and run together on one line, cut off where the page
 * ends. All of it leads to the bulletin itself. A board with nothing on it
 * still has its label, which is the way in for whoever can post to it.
 */
export function BulletinLine({ notices, timeZone, href }: BulletinLineProps) {
  return (
    <Link href={href} className={styles.line}>
      <span className={styles.label}>Bulletin</span>
      {notices.map((notice) => (
        <span key={notice.id} className={styles.item}>
          <time className={styles.date} dateTime={notice.createdAt.toISOString()}>
            {notice.createdAt.toLocaleDateString("en-US", { timeZone, month: "2-digit", day: "2-digit" })}
          </time>{" "}
          {notice.text}
        </span>
      ))}
    </Link>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { formatShortDate, readingMinutes } from "./format";
import styles from "./Byline.module.css";

interface BylineProps {
  author: string;
  /** The writer's page, for a piece published under a pen name. */
  href?: string;
  createdAt: string;
  wordCount: number;
  /** Set after the date: the note that the piece was edited. */
  edited?: ReactNode;
}

export function Byline({ author, href, createdAt, wordCount, edited }: BylineProps) {
  return (
    <div className={styles.byline}>
      <span className={styles.author}>
        <span className={styles.by}>By</span> {href ? <Link href={href}>{author}</Link> : author}
      </span>
      <span className={styles.meta}>
        <time dateTime={createdAt}>{formatShortDate(createdAt)}</time>
        {edited && " · "}
        {edited}
        {" · "}
        {readingMinutes(wordCount)} min read
      </span>
    </div>
  );
}

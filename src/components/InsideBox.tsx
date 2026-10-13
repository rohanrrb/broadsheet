import Link from "next/link";
import type { FeedTeaser } from "@/feed/feed";
import { articleHref } from "./StoryModule";
import styles from "./InsideBox.module.css";

/** The front page's index: headline-only pointers to stories on later pages. */
export function InsideBox({ teasers }: { teasers: readonly FeedTeaser[] }) {
  return (
    <nav className={styles.box} aria-label="Inside this edition">
      <h2 className={styles.title}>Inside</h2>
      <ol className={styles.list}>
        {teasers.map((teaser) => (
          <InsideItem key={teaser.article.id} teaser={teaser} />
        ))}
      </ol>
    </nav>
  );
}

function InsideItem({ teaser: { article, page } }: { teaser: FeedTeaser }) {
  return (
    <li className={styles.item}>
      <p className={styles.kicker}>{article.kicker}</p>
      <Link href={articleHref(article)} className={styles.headline}>
        {article.title}
      </Link>
      <p className={styles.page}>
        Page {page}
        <span aria-hidden> | </span>
        {article.kicker}
      </p>
    </li>
  );
}

import Link from "next/link";
import type { FeedArticle } from "@/feed/article";
import { Author } from "./StoryModule";
import styles from "./RelatedColumn.module.css";

/**
 * Pieces to read next, set down the side of a piece as the front page sets
 * its stories: kicker, headline, byline and the opening of the text, cut
 * off, with the page it continues on. A click anywhere on one opens it.
 */
export function RelatedColumn({ articles }: { articles: readonly FeedArticle[] }) {
  if (articles.length === 0) return null;
  return (
    <nav className={styles.column} aria-label="More">
      <h2 className={styles.title}>More</h2>
      <ol className={styles.list}>
        {articles.map((article) => (
          <li key={article.id} className={styles.story} data-tile-href={article.href}>
            <p className={styles.kicker}>{article.kicker}</p>
            <h3 className={styles.headline}>
              <Link href={article.href}>{article.title}</Link>
            </h3>
            <p className={styles.byline}>
              By <Author article={article} className={styles.author} />
            </p>
            <p className={styles.excerpt}>{article.excerpt}</p>
            <p className={styles.jump}>
              <Link href={article.href}>Continued on Page W{article.id}</Link>
            </p>
          </li>
        ))}
      </ol>
    </nav>
  );
}

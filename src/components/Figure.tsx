import Link from "next/link";
import type { CSSProperties } from "react";
import type { FeedArticle } from "@/feed/article";
import { ArticleImage } from "./ArticleImage";
import styles from "./Figure.module.css";

interface FigureProps {
  article: FeedArticle & { imageUrl: string };
  href: string;
  /** Rows the photo is given; it may grow to take up slack in its box. */
  rows: number;
  /** The cover prints in color; everything else in newsprint gray. */
  tone: "color" | "newsprint";
  /** Caption text; the photo credit is always shown. */
  caption?: string;
  eager?: boolean;
  className?: string;
}

export function Figure({ article, href, rows, tone, caption, eager, className }: FigureProps) {
  const style = { "--photo-rows": rows } as CSSProperties;
  return (
    <figure className={[styles.figure, className].filter(Boolean).join(" ")} style={style}>
      <Link href={href} className={styles.frame} tabIndex={-1} aria-hidden>
        <ArticleImage src={article.imageUrl} className={styles[tone]} eager={eager} />
      </Link>
      <figcaption className={styles.caption}>
        {article.imageCredit && <span className={styles.credit}>{article.imageCredit}</span>}
        {caption && <span>{caption}</span>}
      </figcaption>
    </figure>
  );
}

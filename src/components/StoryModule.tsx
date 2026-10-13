import Link from "next/link";
import type { CSSProperties } from "react";
import { METRICS } from "@/core/layout";
import type { FeedArticle } from "@/feed/article";
import type { FeedModuleView } from "@/feed/feed";
import { Figure } from "./Figure";
import { FitText } from "./FitText";
import { writerHref } from "./format";
import styles from "./StoryModule.module.css";

/** Any story other than the cover: lead, standard, opinion, or brief. */
export function StoryModule({ module, eager = false }: { module: FeedModuleView; eager?: boolean }) {
  const { article, kind } = module;
  const href = articleHref(article);
  const style = { "--scale": METRICS.headlineScale[module.headline - 1] } as CSSProperties;
  const photo = module.imageRows > 0 && article.imageUrl ? { ...article, imageUrl: article.imageUrl } : null;

  return (
    <div className={styles.story} data-kind={kind} style={style}>
      {kind !== "opinion" && <p className={styles.kicker}>{article.kicker}</p>}
      <h2 className={styles.headline}>
        <Link href={href}>{article.title}</Link>
      </h2>
      {kind === "opinion" && <Columnist article={article} />}
      {photo && (
        <Figure
          article={photo}
          href={href}
          rows={module.imageRows}
          tone="newsprint"
          caption={article.imageCaption}
          eager={eager}
        />
      )}
      {kind !== "opinion" && (
        <p className={styles.byline}>
          By <Author article={article} className={styles.author} />
        </p>
      )}
      <FitText
        className={photo ? `${styles.body} ${styles.bodyBesidePhoto}` : styles.body}
        blocks={module.blocks}
        budgetWords={module.budgetWords}
        truncated={module.truncated}
        jump={jumpTo(article)}
      />
    </div>
  );
}

/** A columnist's mark: an engraved-style monogram, their name, and the section. */
function Columnist({ article }: { article: FeedArticle }) {
  return (
    <>
      <div className={styles.portrait} aria-hidden>
        <span>{initialsOf(article.author)}</span>
      </div>
      <p className={styles.columnist}>
        <Author article={article} className={styles.author} />
      </p>
      <p className={styles.opinionKicker}>{article.kicker}</p>
    </>
  );
}

/** The author's name as they wrote it, case and all, linked to their page if they have one. */
export function Author({ article, className }: { article: FeedArticle; className?: string }) {
  return article.authorHasPage ? (
    <Link href={writerHref(article.author)} className={className}>
      {article.author}
    </Link>
  ) : (
    <span className={className}>{article.author}</span>
  );
}

export function articleHref(article: FeedArticle): string {
  return `/w/${article.id}`;
}

/** Each writing has its own page, W-numbered like a newspaper section. */
export function jumpTo(article: FeedArticle) {
  return { label: `Continued on Page W${article.id}`, href: articleHref(article) };
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

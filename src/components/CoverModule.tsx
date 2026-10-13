import Link from "next/link";
import type { CSSProperties } from "react";
import { coverSideCols } from "@/core/layout";
import { wordText, type Block } from "@/feed/blocks";
import type { FeedModuleView } from "@/feed/feed";
import { Figure } from "./Figure";
import { FitText } from "./FitText";
import { SearchBar } from "./SearchBar";
import { Author, articleHref, jumpTo } from "./StoryModule";
import styles from "./CoverModule.module.css";

/** Titles this short are set as an all-caps banner. */
const CAPS_BANNER_MAX = 64;

/**
 * The front-page story: the paper's search field, a banner
 * headline across the whole box, then the photo beside a narrow column of
 * text, or the text alone across the box when the piece has no photo.
 */
export function CoverModule({ module }: { module: FeedModuleView }) {
  const { article, rect } = module;
  const href = articleHref(article);
  const sideCols = article.imageUrl ? coverSideCols(rect.cols) : 0;
  const caps = article.title.length <= CAPS_BANNER_MAX;
  const dek = firstSentence(article.excerpt);
  const style = {
    "--photo-cols": rect.cols - sideCols,
    "--side-cols": sideCols,
    "--title-chars": article.title.length,
  } as CSSProperties;

  return (
    <div className={styles.cover} style={style} data-caps={caps || undefined}>
      <header className={styles.banner}>
        <SearchBar centered />
        <h1 className={styles.headline}>
          <Link href={href}>{article.title}</Link>
        </h1>
      </header>
      <div className={article.imageUrl ? styles.body : styles.bodyTextOnly}>
        {article.imageUrl && (
          <Figure
            article={{ ...article, imageUrl: article.imageUrl }}
            href={href}
            rows={module.imageRows}
            tone="color"
            caption={article.imageCaption}
            eager
            className={styles.figure}
          />
        )}
        <div className={styles.side}>
          <p className={styles.dek}>{dek}</p>
          <p className={styles.byline}>
            By <Author article={article} className={styles.author} />
          </p>
          <FitText
            className={styles.text}
            blocks={withoutLead(module.blocks, dek)}
            budgetWords={module.budgetWords}
            truncated={module.truncated}
            jump={jumpTo(article)}
          />
        </div>
      </div>
    </div>
  );
}

function firstSentence(text: string): string {
  const match = /^.*?[.!?](?=\s|$)/.exec(text);
  return (match?.[0] ?? text).replace(/…$/, "");
}

/** The body minus the sentence already set as the dek, so it is not printed twice. */
function withoutLead(blocks: Block[], dek: string): Block[] {
  const [first, ...rest] = blocks;
  const dekWords = dek.split(/\s+/).filter(Boolean).length;
  if (!first || first.heading || first.words.slice(0, dekWords).map(wordText).join(" ") !== dek) return blocks;
  const remainder = first.words.slice(dekWords);
  return remainder.length > 0 ? [{ words: remainder }, ...rest] : rest;
}

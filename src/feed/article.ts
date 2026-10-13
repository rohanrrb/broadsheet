import type { ArticleSummary } from "@/core/layout";
import { pieceHref, type Writing } from "@/core/writings";
import { sectionOf } from "./sections";
import { blockText, proseBlocks, type Block } from "./blocks";
import { countWords, firstImage } from "./tiptap";

/** What the feed shows for one writing: the layout summary plus newspaper furniture. */
export interface FeedArticle extends ArticleSummary {
  /** The byline, exactly as the writer set their name. */
  author: string;
  /** Whether the author has a writer's page; pieces from before pen names do not. */
  authorHasPage: boolean;
  /** Where the piece is read. */
  href: string;
  kicker: string;
  imageCaption?: string;
  imageCredit?: string;
}

/** A feed article with its body text, which only placed modules need. */
export interface FeedEntry {
  article: FeedArticle;
  blocks: Block[];
}

const EXCERPT_WORDS = 70;

export function toFeedEntry(writing: Writing): FeedEntry {
  const blocks = proseBlocks(writing.body);
  const paragraphs = blocks.filter((block) => !block.heading).map(blockText);
  const section = sectionOf(writing.title);
  const image = firstImage(writing.body);
  return {
    blocks,
    article: {
      id: String(writing.id),
      title: section.headline,
      author: writing.author,
      authorHasPage: writing.writerId !== null,
      href: pieceHref(writing),
      kicker: section.kicker,
      voice: section.voice,
      excerpt: excerptOf(paragraphs),
      wordCount: countWords(writing.body),
      createdAt: writing.createdAt.toISOString(),
      imageUrl: image?.src,
      imageCaption: image?.alt && image.alt !== writing.title ? image.alt : undefined,
      imageCredit: image && creditOf(image.src),
    },
  };
}

/** Opening words of the piece, cut on a word boundary. */
function excerptOf(paragraphs: string[]): string {
  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean);
  if (words.length <= EXCERPT_WORDS) return words.join(" ");
  return `${words.slice(0, EXCERPT_WORDS).join(" ").replace(/[,.;:]$/, "")}…`;
}

/** Photos are credited to the host that serves them. */
function creditOf(src: string): string | undefined {
  try {
    return new URL(src).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

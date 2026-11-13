/** How long one comment may run: a letter, not a piece. */
export const MAX_COMMENT_WORDS = 300;
/** No word is so long that this many of them pass this; it stops one endless "word". */
export const MAX_COMMENT_LENGTH = 3000;
/** How many comments are sent at a time, as the column is scrolled. */
export const COMMENTS_PER_PAGE = 30;
/** The most replies one thread sends when it is opened. */
export const MAX_THREAD = 500;

/**
 * A comment as it is kept: paragraphs split by one blank line, single spaces
 * inside them, none at the ends.
 */
export function tidyComment(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function countCommentWords(text: string): number {
  const tidy = text.replace(/\s+/g, " ").trim();
  return tidy ? tidy.split(" ").length : 0;
}

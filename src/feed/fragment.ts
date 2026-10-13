/** How many closing words name the place: enough that they seldom occur earlier in the piece. */
const FRAGMENT_WORDS = 6;

/**
 * The address of a piece at the place its text left off on a page of the
 * feed: a text fragment (`#:~:text=`) of the last words shown, which the
 * browser scrolls to and marks. The words must come from one paragraph, since
 * a fragment does not match across two. Without any, the address is unchanged.
 */
export function continuedAt(href: string, shown: readonly string[]): string {
  const words = shown.slice(-FRAGMENT_WORDS);
  if (words.length === 0) return href;
  // A hyphen, comma or ampersand would be read as part of the fragment's own syntax.
  const text = encodeURIComponent(words.join(" ")).replace(/-/g, "%2D");
  return `${href}#:~:text=${text}`;
}

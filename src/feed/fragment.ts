/** How many closing words are marked on the piece's page. */
const MARKED_WORDS = 6;
/** Words before the marked ones that are always given, so the place is told by more than a common phrase. */
const USUAL_CONTEXT = 3;
/** The most words given before the marked ones; past this the address would grow without the place getting any surer. */
const MOST_CONTEXT = 40;

/**
 * The address of a piece at the place its text left off on a page of the
 * feed: a text fragment (`#:~:text=`), which the browser scrolls to and marks.
 * The last words shown are marked, and the words before them are given as
 * context. A browser takes the first place that matches, so the context is
 * lengthened until no earlier place in the text shown reads the same; it stays
 * inside the last paragraph while it can, and reaches into the blocks before
 * only when that paragraph is not enough.
 *
 * `shown` is the text shown, block by block, ending with the paragraph it
 * stopped in. With no words there the address is unchanged.
 */
export function continuedAt(href: string, shown: readonly (readonly string[])[]): string {
  const paragraph = shown[shown.length - 1] ?? [];
  if (paragraph.length === 0) return href;
  const words = shown.flat();
  const marked = Math.min(MARKED_WORDS, paragraph.length);
  const most = Math.min(MOST_CONTEXT, words.length - marked);
  let context = Math.min(USUAL_CONTEXT, paragraph.length - marked);
  while (context < most && occursEarlier(words, marked + context)) context++;
  const text = fragmentText(words.slice(-marked));
  const prefix = context > 0 ? `${fragmentText(words.slice(-marked - context, -marked))}-,` : "";
  return `${href}#:~:text=${prefix}${text}`;
}

/**
 * Whether the last `count` words also read, in that order, somewhere before
 * the end. Compared as plain lower-case text, which finds every place a
 * browser would and a few it would not, so it errs toward more context.
 */
function occursEarlier(words: readonly string[], count: number): boolean {
  const all = words.join(" ").toLowerCase();
  const ending = words.slice(-count).join(" ").toLowerCase();
  return all.indexOf(ending) < all.length - ending.length;
}

/** Words as a fragment carries them. A hyphen, comma or ampersand would be read as part of its own syntax. */
function fragmentText(words: readonly string[]): string {
  return encodeURIComponent(words.join(" ")).replace(/-/g, "%2D");
}

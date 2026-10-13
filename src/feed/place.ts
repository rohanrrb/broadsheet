/**
 * A place in a piece's text: a paragraph or subhead, by its number in the
 * piece (see `textblockNumbers`), and a count of words into it. A "Continued
 * on" line carries the place its text stopped at, and the piece's page finds
 * it by counting, so the same words elsewhere in the piece cannot be mistaken
 * for it.
 */
export interface Place {
  block: number;
  /** How many of the block's words come before the place. */
  words: number;
}

const HASH = /^#at-(\d{1,6})-(\d{1,6})$/;

/** The address of a piece, opened at a place in it. */
export function hrefAt(href: string, place: Place): string {
  return `${href}#at-${place.block}-${place.words}`;
}

/** The place an address's hash names, if it names one. */
export function placeIn(hash: string): Place | null {
  const match = HASH.exec(hash);
  return match ? { block: Number(match[1]), words: Number(match[2]) } : null;
}

/**
 * A place in a piece's text: a paragraph or subhead, by its number in the
 * piece (see `textblockNumbers`), and a count of words into it. A "Continued
 * on" line carries the place its text stopped at, and the piece's page is set
 * with the words before it marked, so the same words elsewhere in the piece
 * cannot be mistaken for it and the reader's browser has nothing to work out.
 */
export interface Place {
  block: number;
  /** How many of the block's words come before the place. */
  words: number;
}

/** What the mark on the piece's page is called, for the address to lead to. */
export const PLACE_ID = "continued";

const PLACE = /^(\d{1,6})-(\d{1,6})$/;

/** The address of a piece, opened at a place in it. */
export function hrefAt(href: string, place: Place): string {
  return `${href}?at=${place.block}-${place.words}#${PLACE_ID}`;
}

/** The place an address's `at` names, if it names one. */
export function placeIn(at: unknown): Place | null {
  const match = typeof at === "string" ? PLACE.exec(at) : null;
  return match ? { block: Number(match[1]), words: Number(match[2]) } : null;
}

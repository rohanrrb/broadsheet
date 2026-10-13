/** How long one notice may run. A bulletin is for a line or two, not a piece. */
export const MAX_NOTICE_WORDS = 40;
/** No word is so long that forty of them pass this; it stops one endless "word". */
export const MAX_NOTICE_LENGTH = 400;
/** How many notices a board keeps. Posting one more takes the oldest down. */
export const MAX_NOTICES = 5;

/** A notice as it is kept: one line, single spaces, none at the ends. */
export function tidyNotice(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function countWords(text: string): number {
  const tidy = tidyNotice(text);
  return tidy ? tidy.split(" ").length : 0;
}

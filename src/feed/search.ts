import type { InstanceDb } from "@/core/db";
import type { Writing } from "@/core/writings";
import { loadFeedWritings } from "./feed";
import { nodeText, topLevelNodes } from "./tiptap";

const MAX_RESULTS = 50;

/**
 * Pieces in print that contain every word of the query, in the headline, the
 * byline or the text. A word is found wherever its letters are, so "cat" finds
 * "category"; case and accents are ignored, so "cafe" finds "Café" and "tomas"
 * finds the byline "Tomás". Headline matches come first; within each group
 * the feed's own order holds. Reads the whole paper, which is fine for a small
 * instance; a large one would want an index.
 */
export function searchWritings(db: InstanceDb, query: string): Writing[] {
  const words = wordsOf(query);
  if (words.length === 0) return [];
  const inHeadline: Writing[] = [];
  const elsewhere: Writing[] = [];
  for (const writing of loadFeedWritings(db)) {
    const headline = plain(writing.title);
    if (words.every((word) => headline.includes(word))) inHeadline.push(writing);
    else if (words.every((word) => haystackOf(writing).includes(word))) elsewhere.push(writing);
  }
  return [...inHeadline, ...elsewhere].slice(0, MAX_RESULTS);
}

/** The query as plain words; punctuation around them is ignored. */
export function wordsOf(query: string): string[] {
  return plain(query).match(/[\p{L}\p{N}_]+/gu) ?? [];
}

/** Text for comparing: lower case, with accents taken off. */
function plain(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase();
}

function haystackOf(writing: Writing): string {
  const body = topLevelNodes(writing.body).map(nodeText).join(" ");
  return plain(`${writing.title} ${writing.author} ${body}`);
}

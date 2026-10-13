"use client";

import { useEffect } from "react";
import { placeIn } from "@/feed/place";

/** How many words before the place are marked: the last the reader saw on the page they came from. */
const MARKED_WORDS = 6;
/** The name `::highlight()` in the stylesheet knows the mark by. */
const HIGHLIGHT = "continued";

/**
 * Opens a piece where a "Continued on" line left off. The address names the
 * place (see `Place`); this finds the paragraph by its number, counts to the
 * word, brings it into view and marks the words before it. The mark is drawn
 * over the text and changes nothing in the page. Renders nothing itself.
 */
export function ContinuedFrom() {
  useEffect(() => {
    const place = placeIn(window.location.hash);
    const block = place && document.querySelector(`[data-block="${place.block}"]`);
    if (!place || !block) return;
    const words = wordsIn(block);
    const end = Math.min(place.words, words.length);
    if (end < 1) return;
    const range = document.createRange();
    range.setStart(...words[Math.max(0, end - MARKED_WORDS)].start);
    range.setEnd(...words[end - 1].end);

    const box = range.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, window.scrollY + box.top - window.innerHeight / 3) });
    // An older browser has no way to draw the mark; it still opens at the place.
    if (typeof Highlight === "undefined" || !CSS.highlights) return;
    CSS.highlights.set(HIGHLIGHT, new Highlight(range));
    return () => void CSS.highlights.delete(HIGHLIGHT);
  }, []);
  return null;
}

type Point = [node: Text, offset: number];

/**
 * Where each word of a paragraph begins and ends in the page, split as the
 * feed splits them: on white space and line breaks, and not where bold,
 * italic or a link begins or ends inside a word.
 */
function wordsIn(block: Element): { start: Point; end: Point }[] {
  const words: { start: Point; end: Point }[] = [];
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  /** Whether the last word ran to the end of its text, so the next text may carry it on. */
  let open = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!(node instanceof Text)) {
      if (node.nodeName === "BR") open = false;
      continue;
    }
    for (const match of node.data.matchAll(/\S+/g)) {
      const end: Point = [node, match.index + match[0].length];
      if (open && match.index === 0) words[words.length - 1].end = end;
      else words.push({ start: [node, match.index], end });
      open = false;
    }
    if (node.data.length > 0) open = /\S$/.test(node.data);
  }
  return words;
}

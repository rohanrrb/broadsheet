"use client";

import { useLayoutEffect, useRef } from "react";
import { BOLD, ITALIC, type Block, type Word } from "@/feed/blocks";
import { hrefAt, type Place } from "@/feed/place";

interface FitTextProps {
  blocks: readonly Block[];
  /** Words the layout estimated will fit; shown before fitting and on narrow screens. */
  budgetWords: number;
  /** Whether the story goes on past `blocks`. */
  truncated: boolean;
  jump: { label: string; href: string };
  className?: string;
}

/** Fitting only applies where the page grid gives every box a fixed height. */
const FIXED_GRID = "(min-width: 1024px)";

/**
 * Body text fitted to its box, newspaper style: as many whole words as fit,
 * in the writer's bold and italic and under their subheads, then a jump line
 * to the rest of the story. The server renders the layout's
 * estimate; in the browser a binary search on the word count finds the exact
 * amount, and repeats whenever the box is resized or fonts finish loading.
 */
export function FitText({ blocks, budgetWords, truncated, jump, className }: FitTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const total = blocks.reduce((n, block) => n + block.words.length, 0);
  const initial = Math.min(budgetWords, total);
  const html = (count: number) => bodyHtml(blocks, count, count < total || truncated ? jump : null);

  useLayoutEffect(() => {
    const element = ref.current;
    const box = element?.parentElement;
    if (!element || !box) return;
    const fit = () => {
      const count = window.matchMedia(FIXED_GRID).matches ? largestFitting(element, total, html) : initial;
      element.innerHTML = html(count);
    };
    fit();
    document.fonts?.ready.then(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
    // `html` is rebuilt each render from the same props; the text is keyed by them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, budgetWords, truncated, jump.href, jump.label]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html(initial) }} />;
}

/** The most words (0..total) that fit without overflowing the element. */
function largestFitting(element: HTMLElement, total: number, html: (count: number) => string): number {
  const fits = (count: number) => {
    element.innerHTML = html(count);
    return !overflows(element);
  };
  if (fits(total)) return total;
  let low = 0;
  let high = total;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return low;
}

function overflows(element: HTMLElement): boolean {
  return element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1;
}

function bodyHtml(blocks: readonly Block[], count: number, jump: { label: string; href: string } | null): string {
  const parts: string[] = [];
  let left = count;
  let endsOnSubhead = false;
  /** Where the text stops: the last paragraph shown, and how far into it. */
  let stop: Place | null = null;
  for (const block of blocks) {
    if (left <= 0) break;
    const shown = block.words.slice(0, left);
    const words = shown.map(wordHtml).join(" ");
    parts.push(block.heading ? `<p data-subhead>${words}</p>` : `<p>${words}</p>`);
    endsOnSubhead = block.heading === true;
    if (!block.heading) stop = { block: block.at, words: (block.skipped ?? 0) + shown.length };
    left -= block.words.length;
  }
  // A subhead is never the last thing in a box: it belongs to the text under it.
  if (endsOnSubhead) parts.pop();
  if (jump) {
    const href = stop ? hrefAt(jump.href, stop) : jump.href;
    parts.push(`<p data-jump><a href="${escapeHtml(href)}">${escapeHtml(jump.label)}</a></p>`);
  }
  return parts.join("");
}

function wordHtml(word: Word): string {
  if (typeof word === "string") return escapeHtml(word);
  return word
    .map(([text, marks]) => {
      const bold = marks & BOLD ? `<b>${escapeHtml(text)}</b>` : escapeHtml(text);
      return marks & ITALIC ? `<i>${bold}</i>` : bold;
    })
    .join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import type { TiptapDoc } from "@/core/db";
import { textblockNumbers, topLevelNodes, type TiptapNode } from "./tiptap";

/**
 * A piece's running text as the feed sets it: paragraphs and the subheads
 * between them, word by word, with the bold and italic the writer gave them.
 * Kept small, since every box on a page carries its own.
 */

export const BOLD = 1;
export const ITALIC = 2;

/** A stretch of one word set one way: its text, and BOLD and ITALIC added together. */
export type Span = [text: string, marks: number];

/** One word. A plain string when none of it is bold or italic. */
export type Word = string | Span[];

export interface Block {
  /** A subhead from inside the piece, rather than a paragraph. */
  heading?: true;
  /** Which of the piece's paragraphs and headings this is: see `textblockNumbers`. */
  at: number;
  /** How many of its words came before `words`, when its opening is set elsewhere. */
  skipped?: number;
  words: Word[];
}

export function wordText(word: Word): string {
  return typeof word === "string" ? word : word.map(([text]) => text).join("");
}

export function blockText(block: Block): string {
  return block.words.map(wordText).join(" ");
}

/**
 * The running prose in reading order: top-level paragraphs, list items, and
 * the subheads among them. Pull quotes and photos are left out, as a
 * newspaper's jump text would, and so is a subhead with nothing above it,
 * which would only sit under the headline, or nothing below it.
 */
export function proseBlocks(doc: TiptapDoc): Block[] {
  const numbers = textblockNumbers(doc);
  const blocks = blocksIn(topLevelNodes(doc), true, numbers).filter((block) => block.words.length > 0);
  const first = blocks.findIndex((block) => !block.heading);
  const last = blocks.findLastIndex((block) => !block.heading);
  return first < 0 ? [] : blocks.slice(first, last + 1);
}

function blocksIn(nodes: TiptapNode[], topLevel: boolean, numbers: Map<TiptapNode, number>): Block[] {
  return nodes.flatMap((node): Block[] => {
    const at = numbers.get(node) ?? 0;
    if (node.type === "paragraph") return [{ at, words: wordsOf(node) }];
    if (node.type === "heading") return topLevel ? [{ heading: true, at, words: wordsOf(node).map(wordText) }] : [];
    if (node.type === "blockquote") return [];
    return blocksIn(node.content ?? [], false, numbers);
  });
}

/** The words of a paragraph or heading, split on white space wherever it falls among the marks. */
function wordsOf(block: TiptapNode): Word[] {
  const words: Word[] = [];
  let word: Span[] = [];
  const end = () => {
    if (word.length > 0) words.push(word.every(([, marks]) => marks === 0) ? wordText(word) : word);
    word = [];
  };
  for (const node of block.content ?? []) {
    if (node.type !== "text") {
      end();
      continue;
    }
    const marks = marksOf(node);
    for (const piece of (node.text ?? "").split(/(\s+)/)) {
      if (!piece) continue;
      if (/^\s/.test(piece)) end();
      else if (word.at(-1)?.[1] === marks) word[word.length - 1] = [word.at(-1)![0] + piece, marks];
      else word.push([piece, marks]);
    }
  }
  end();
  return words;
}

function marksOf(node: TiptapNode): number {
  const has = (type: string) => node.marks?.some((mark) => mark.type === type) ?? false;
  return (has("bold") ? BOLD : 0) + (has("italic") ? ITALIC : 0);
}

/** How many words before a place are marked: the last the reader saw on the page they came from. */
const MARKED_WORDS = 6;
/** The mark put on those words; the first stretch of them is `first`, for the address to lead to. */
export const CONTINUED = "continued";

/**
 * A paragraph's or heading's content with the words before a place marked:
 * the last few of its first `words` words, counted as `wordsOf` counts them.
 * Text is split where the marked stretch begins and ends; nothing else changes.
 */
export function markBefore(block: TiptapNode, words: number): TiptapNode[] {
  const content = block.content ?? [];
  const bounds = wordBounds(content);
  const end = Math.min(words, bounds.length);
  if (end < 1) return content;
  const [fromNode, fromOffset] = bounds[Math.max(0, end - MARKED_WORDS)].start;
  const [toNode, toOffset] = bounds[end - 1].end;
  let first = true;
  return content.flatMap((node, i): TiptapNode[] => {
    const text = node.text ?? "";
    if (node.type !== "text" || i < fromNode || i > toNode) return [node];
    const a = i === fromNode ? fromOffset : 0;
    const b = i === toNode ? toOffset : text.length;
    const marked = { ...node, text: text.slice(a, b), marks: [...(node.marks ?? []), { type: CONTINUED, attrs: { first } }] };
    first = false;
    return [{ ...node, text: text.slice(0, a) }, marked, { ...node, text: text.slice(b) }].filter((part) => part.text);
  });
}

type Point = [node: number, offset: number];

/** Where each word begins and ends among a block's inline nodes, split exactly as `wordsOf` splits them. */
function wordBounds(content: TiptapNode[]): { start: Point; end: Point }[] {
  const bounds: { start: Point; end: Point }[] = [];
  let open = false;
  content.forEach((node, i) => {
    if (node.type !== "text") {
      open = false;
      return;
    }
    let offset = 0;
    for (const piece of (node.text ?? "").split(/(\s+)/)) {
      if (!piece) continue;
      if (/^\s/.test(piece)) open = false;
      else {
        if (!open) bounds.push({ start: [i, offset], end: [i, offset] });
        bounds[bounds.length - 1].end = [i, offset + piece.length];
        open = true;
      }
      offset += piece.length;
    }
  });
  return bounds;
}

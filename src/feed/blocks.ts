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

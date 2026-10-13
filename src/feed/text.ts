import { wordText, type Block } from "./blocks";

/**
 * Cuts body text for a box. The layout's character budget is an estimate, so
 * a little extra text is sent past it for the renderer to fit exactly.
 */

/** Text sent beyond the budget, as a share of it. */
const SLACK = 0.6;
/** Even a tiny box gets this much to fit from. */
const MIN_CHARS = 160;

export interface BoxText {
  blocks: Block[];
  budgetWords: number;
  truncated: boolean;
}

export function cutToBudget(blocks: readonly Block[], budgetChars: number): BoxText {
  const sendChars = Math.max(MIN_CHARS, budgetChars * (1 + SLACK));
  const sent = takeChars(blocks, sendChars);
  return {
    blocks: sent,
    budgetWords: countWords(takeChars(blocks, budgetChars)),
    truncated: countWords(sent) < countWords(blocks),
  };
}

/** Whole words, block by block, up to `limit` characters. */
function takeChars(blocks: readonly Block[], limit: number): Block[] {
  const out: Block[] = [];
  let used = 0;
  for (const block of blocks) {
    let taken = 0;
    for (const word of block.words) {
      const length = wordText(word).length + 1;
      if (used + length > limit) break;
      used += length;
      taken += 1;
    }
    if (taken > 0) out.push({ ...block, words: block.words.slice(0, taken) });
    if (taken < block.words.length) break;
  }
  return out;
}

function countWords(blocks: readonly Block[]): number {
  return blocks.reduce((n, block) => n + block.words.length, 0);
}

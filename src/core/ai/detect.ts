import type { TiptapDoc } from "@/core/db";
import { plainTextOf } from "./text";

/**
 * A heuristic guess at whether a piece of writing reads as AI-generated: not
 * a verdict, a signal for an editor to weigh. Looks for two cheap tells that
 * need no network call and no model of their own: stock phrasing that large
 * language models lean on, and sentences whose lengths run suspiciously even,
 * where human prose tends to vary more.
 */
export interface AiSignal {
  /** 0 (reads as plainly human) to 1 (several tells fire at once). */
  score: number;
  /** Which tells fired, in the order they were checked. */
  reasons: string[];
}

/** At or above this score, the desk shows the writing as possibly AI-written. */
export const AI_FLAG_THRESHOLD = 0.5;

/** Phrasing that shows up far more often in LLM output than in ordinary writing. */
const STOCK_PHRASES = [
  "it's important to note that",
  "it is important to note that",
  "it is worth noting that",
  "in today's fast-paced world",
  "in an increasingly digital world",
  "in the ever-evolving landscape of",
  "navigating the complexities of",
  "delve into",
  "in the realm of",
  "stands as a testament to",
  "a testament to the power of",
  "plays a pivotal role",
  "fosters a sense of",
  "a tapestry of",
  "unlock the potential",
  "this underscores the importance of",
  "boasts a rich history",
  "nestled in the heart of",
  "left an indelible mark",
  "a beacon of hope",
];

/** Below this, sentence lengths are treated as varying normally. */
const UNIFORMITY_THRESHOLD = 0.4;
/** Too few sentences to say anything about their spread. */
const MIN_SENTENCES_FOR_UNIFORMITY = 5;

/** `detectAi` run on a writing's body. */
export function detectAiInWriting(body: TiptapDoc): AiSignal {
  return detectAi(plainTextOf(body));
}

export function detectAi(text: string): AiSignal {
  const reasons: string[] = [];
  let score = 0;

  const phraseScore = stockPhraseScore(text, reasons);
  score += phraseScore;

  const uniformityScore = sentenceUniformityScore(text, reasons);
  score += uniformityScore;

  return { score: Math.min(1, score), reasons };
}

function stockPhraseScore(text: string, reasons: string[]): number {
  const normalized = text.toLowerCase();
  const hits = STOCK_PHRASES.filter((phrase) => normalized.includes(phrase));
  if (hits.length === 0) return 0;
  reasons.push(hits.length === 1 ? `uses the stock phrase "${hits[0]}"` : `uses ${hits.length} stock AI phrases`);
  return Math.min(0.6, hits.length * 0.2);
}

function sentenceUniformityScore(text: string, reasons: string[]): number {
  const lengths = splitSentences(text).map(wordCount);
  if (lengths.length < MIN_SENTENCES_FOR_UNIFORMITY) return 0;
  const mean = average(lengths);
  if (mean === 0) return 0;
  const variation = Math.sqrt(average(lengths.map((n) => (n - mean) ** 2))) / mean;
  if (variation >= UNIFORMITY_THRESHOLD) return 0;
  reasons.push("sentences run to a strikingly uniform length");
  return 0.55;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function wordCount(text: string): number {
  return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

function average(numbers: number[]): number {
  return numbers.length === 0 ? 0 : numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

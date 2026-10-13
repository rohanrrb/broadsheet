import type { ArticleSummary, CoverBlock } from "./types";

/**
 * Picks the front-page story. Implementations must be deterministic: the same
 * articles always yield the same choice. Return `null` only for an empty list.
 */
export interface CoverStrategy {
  readonly name: string;
  select(articles: readonly ArticleSummary[]): CoverBlock | null;
}

export interface CoverWeights {
  recency: number;
  length: number;
  image: number;
}

export const DEFAULT_COVER_WEIGHTS: CoverWeights = {
  recency: 0.5,
  length: 0.3,
  image: 0.2,
};

/** Fewest words that keep a cover's column of text from standing nearly empty beside its photo. */
const COVER_MIN_WORDS = 150;

/**
 * Whether an article would make a decent cover: a photo to lead the page
 * with, and enough text to set beside it. Any article can be the cover; this
 * says which ones do the job well.
 */
export function suitsCover(article: ArticleSummary): boolean {
  return Boolean(article.imageUrl) && article.wordCount >= COVER_MIN_WORDS;
}

/** Word count at which a piece counts as fully "substantial". */
const SUBSTANTIAL_WORDS = 1200;

type Factor = keyof CoverWeights;
type FactorScores = Record<Factor, number>;

const FACTOR_PHRASES: Record<Factor, string> = {
  recency: "one of the newest pieces",
  length: "a substantial read",
  image: "illustrated with an image",
};

/**
 * Scores each article on recency (relative to the set, not the wall clock, so
 * results stay deterministic), length, and image presence; the best weighted
 * sum wins. Ties go to the newer article, then the id that sorts first as text.
 */
export function weightedCoverStrategy(
  weights: CoverWeights = DEFAULT_COVER_WEIGHTS,
): CoverStrategy {
  return {
    name: "weighted",
    select(articles) {
      if (articles.length === 0) return null;
      const scoreRecency = recencyScorer(articles);
      const scored = articles.map((article) => {
        const factors = scoreFactors(article, scoreRecency);
        return { article, factors, total: weightedSum(factors, weights) };
      });
      const best = scored.reduce((a, b) => (isBetter(b, a) ? b : a));
      return {
        articleId: best.article.id,
        reason: explain(best.factors, weights),
      };
    },
  };
}

export const defaultCoverStrategy: CoverStrategy = weightedCoverStrategy();

/**
 * Puts one chosen article on the cover while it is among those given, and
 * otherwise leaves the choice to `fallback`: an editor's pick, with the
 * algorithm behind it for when there is none or it has left the paper.
 */
export function pinnedCoverStrategy(
  articleId: string | null,
  fallback: CoverStrategy = defaultCoverStrategy,
): CoverStrategy {
  if (articleId === null) return fallback;
  return {
    name: "pinned",
    select(articles) {
      return articles.some((article) => article.id === articleId)
        ? { articleId, reason: "Chosen by the editor." }
        : fallback.select(articles);
    },
  };
}

function recencyScorer(articles: readonly ArticleSummary[]) {
  const times = articles.map(timeOf);
  const newest = Math.max(...times);
  const oldest = Math.min(...times);
  const range = newest - oldest;
  return (article: ArticleSummary) =>
    range === 0 ? 1 : (timeOf(article) - oldest) / range;
}

function scoreFactors(
  article: ArticleSummary,
  scoreRecency: (article: ArticleSummary) => number,
): FactorScores {
  return {
    recency: scoreRecency(article),
    length: Math.min(article.wordCount / SUBSTANTIAL_WORDS, 1),
    image: article.imageUrl ? 1 : 0,
  };
}

function weightedSum(factors: FactorScores, weights: CoverWeights): number {
  return (Object.keys(factors) as Factor[]).reduce(
    (sum, factor) => sum + factors[factor] * weights[factor],
    0,
  );
}

interface Scored {
  article: ArticleSummary;
  total: number;
}

function isBetter(candidate: Scored, current: Scored): boolean {
  if (candidate.total !== current.total) return candidate.total > current.total;
  const timeDelta = timeOf(candidate.article) - timeOf(current.article);
  if (timeDelta !== 0) return timeDelta > 0;
  return candidate.article.id < current.article.id;
}

/** Names the factors that contributed most, strongest first. */
function explain(factors: FactorScores, weights: CoverWeights): string {
  const contributions = (Object.keys(factors) as Factor[])
    .map((factor) => ({ factor, value: factors[factor] * weights[factor] }))
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value);
  if (contributions.length === 0) return "Chosen as the newest available piece.";
  const phrases = contributions.map(({ factor }) => FACTOR_PHRASES[factor]);
  return `Chosen as ${joinPhrases(phrases)}.`;
}

function joinPhrases(phrases: string[]): string {
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}

function timeOf(article: ArticleSummary): number {
  return Date.parse(article.createdAt);
}

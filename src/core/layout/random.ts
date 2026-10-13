/** Seeded randomness. The engine never touches Math.random. */

export type Seed = string | number;

/** A PRNG returning floats in [0, 1). */
export type Random = () => number;

/** FNV-1a: folds any seed into a 32-bit unsigned integer. */
function hashSeed(seed: Seed): number {
  const text = String(seed);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32: small, fast, and good enough for layout choices. */
export function createRandom(seed: Seed): Random {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks one item with probability proportional to its weight. */
export function pickWeighted<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  random: Random,
): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let target = random() * total;
  for (const item of items) {
    target -= weightOf(item);
    if (target < 0) return item;
  }
  return items[items.length - 1];
}

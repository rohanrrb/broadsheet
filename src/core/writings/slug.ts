import { handleOf } from "../writers/handle";

const MAX_SLUG_LENGTH = 60;
/** Addresses under a writer's page that already lead somewhere else. */
const RESERVED = ["bulletin"];

/**
 * A headline as it reads in an address: lower case, accents off, words joined
 * by hyphens, cut at a whole word. "Bus Lanes, Reconsidered" is
 * "bus-lanes-reconsidered". Kept free of database imports, so the browser can
 * build addresses the same way.
 */
export function slugOf(title: string): string {
  const plain = title.normalize("NFKD").replace(/\p{M}+/gu, "").replace(/['’]/g, "").toLowerCase();
  const words = plain.match(/[\p{L}\p{N}]+/gu) ?? [];
  let slug = "";
  for (const word of words) {
    const longer = slug ? `${slug}-${word}` : word;
    if (longer.length > MAX_SLUG_LENGTH) break;
    slug = longer;
  }
  return slug || words[0]?.slice(0, MAX_SLUG_LENGTH) || "untitled";
}

/** The headline's slug, or with a number after it when the writer already has a piece there. */
export function freeSlug(title: string, taken: ReadonlySet<string | null>): string {
  const base = slugOf(title);
  const used = (slug: string) => taken.has(slug) || RESERVED.includes(slug);
  if (!used(base)) return base;
  for (let n = 2; ; n++) if (!used(`${base}-${n}`)) return `${base}-${n}`;
}

/**
 * Where a piece is read: under its writer's page, by the slug it was given at
 * publication. A piece from before pen names has no writer, and keeps its number.
 */
export function pieceHref(piece: { id: number; author: string; writerId: number | null; slug: string | null }): string {
  if (piece.writerId === null || !piece.slug) return `/w/${piece.id}`;
  return `/by/${encodeURIComponent(handleOf(piece.author))}/${encodeURIComponent(piece.slug)}`;
}

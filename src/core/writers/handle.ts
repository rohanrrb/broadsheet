export const MIN_NAME_LENGTH = 2;
/**
 * The longest name a new writer may take. A writer's page sets "<name> on"
 * beside the nameplate on one line, shrinking the name to fit; past this
 * length it would shrink too far to sit well there. Names registered when the
 * limit was longer keep working.
 */
export const MAX_NAME_LENGTH = 20;

/**
 * Latin letters that have no accent to take off yet read as a plainer one,
 * each with the letter it reads as. Small capitals such as "ɢ" are here too:
 * a name set in them would pass for the same name in capitals.
 */
const LOOKALIKES: Record<string, string> = {
  ı: "i", ȷ: "j", ł: "l", ŀ: "l", ø: "o", đ: "d", ð: "d", þ: "p", ß: "ss", æ: "ae", œ: "oe", ŋ: "n", ħ: "h",
  ŧ: "t", ƒ: "f", ſ: "s", ĸ: "k", ƀ: "b", ƶ: "z", ȼ: "c", ƙ: "k", ƴ: "y", ə: "e", ǝ: "e",
  ɑ: "a", ɐ: "a", ɓ: "b", ʙ: "b", ɕ: "c", ɖ: "d", ɗ: "d", ɛ: "e", ɘ: "e", ɡ: "g", ɢ: "g", ɠ: "g", ʜ: "h", ɦ: "h",
  ɪ: "i", ɨ: "i", ɩ: "i", ʝ: "j", ʟ: "l", ɫ: "l", ɬ: "l", ɭ: "l", ɱ: "m", ɴ: "n", ɲ: "n", ɳ: "n", ɔ: "o", ɵ: "o",
  ʀ: "r", ɾ: "r", ɽ: "r", ʂ: "s", ʈ: "t", ʉ: "u", ʊ: "u", ʋ: "v", ʏ: "y", ʐ: "z", ʑ: "z",
};

/**
 * A name folded so that look-alikes collide. Case is ignored; spaces, hyphens
 * and underscores are the same thing; accents are taken off; and a letter that
 * reads as a plainer one counts as it. "Zebra Lord", "zebra-lord", "Zébra
 * Lord" and "zebra_lord" are one writer, so nobody can take a name that would
 * pass for someone else's by changing how it is written.
 * Kept free of database imports, so the browser can fold names the same way.
 */
export function handleOf(name: string): string {
  const bare = name.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase();
  const plain = Array.from(bare, (letter) => LOOKALIKES[letter] ?? letter).join("");
  return plain.trim().replace(/[\s_-]+/g, "-");
}

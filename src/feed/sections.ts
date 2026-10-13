/**
 * Newspaper kickers ("OPINION", "METRO") for writings, which carry no section
 * field. A title prefix such as "Opinion:" or "Letter From the Coast:" is the
 * writer naming the section themselves, so it wins and is lifted out of the
 * headline. Otherwise the first matching keyword in the title picks a desk.
 */

export interface Section {
  kicker: string;
  voice: "news" | "opinion";
  /** The title with any section prefix removed. */
  headline: string;
}

const OPINION_PREFIXES: Record<string, string> = {
  opinion: "Opinion",
  editorial: "Editorial",
  letter: "Letters",
};

/** Checked in order; the first desk with a keyword in the title wins. */
const DESK_KEYWORDS: readonly [string, readonly string[]][] = [
  ["Metro", ["council", "transit", "bus", "route", "road", "recycling", "outage", "parking", "flood", "juror"]],
  ["Business", ["economics", "store", "mall", "software", "productivity", "market"]],
  ["Food", ["kitchen", "knife", "sourdough", "restaurant", "bread", "orchard"]],
  ["Culture", ["library", "libraries", "theater", "orchestra", "semicolon", "map", "letter", "news", "chess", "barber"]],
  ["Living", ["garden", "swim", "nap", "furniture", "weather", "dog", "cat", "night", "ferry"]],
];

const DEFAULT_DESK = "Dispatches";
const PREFIX = /^([^:]{3,40}):\s+(.+)$/;

export function sectionOf(title: string): Section {
  return fromPrefix(title) ?? fromKeywords(title);
}

function fromPrefix(title: string): Section | null {
  const match = PREFIX.exec(title);
  if (!match) return null;
  const [, label, headline] = match;
  const firstWord = label.split(" ")[0].toLowerCase();
  const kicker = OPINION_PREFIXES[firstWord];
  if (!kicker) return null;
  // "Letter From the Coast" is a named column: keep its full name.
  const named = label.includes(" ") ? label : kicker;
  return { kicker: named, voice: "opinion", headline };
}

function fromKeywords(title: string): Section {
  const words = new Set(title.toLowerCase().match(/[a-z]+/g) ?? []);
  const desk = DESK_KEYWORDS.find(([, keywords]) => keywords.some((k) => words.has(k)));
  return { kicker: desk?.[0] ?? DEFAULT_DESK, voice: "news", headline: title };
}

import { getInstanceSettings, type InstanceDb } from "@/core/db";
import { countEditsByWriting, listAllWritings, pieceHref, type Writing } from "@/core/writings";
import { readFeedPlan, type FeedPlan } from "@/feed/feed";
import { sectionOf } from "@/feed/sections";
import { countWords } from "@/feed/tiptap";

/** One writing as the editor's desk lists it: a file in the instance. */
export interface DeskFile {
  id: number;
  /** Where the piece is read. */
  href: string;
  /** The headline as printed, without any section prefix. */
  headline: string;
  author: string;
  /** The desk broadsheet files it under, e.g. "Metro" or "Opinion". */
  section: string;
  /** ISO-8601; set by broadsheet at publication. */
  createdAt: string;
  /** The same date as the paper prints it, in the instance's time zone. */
  publishedOn: string;
  words: number;
  editsUsed: number;
  spiked: boolean;
  /** Whether it was published before pen names, with no writer: the only kind the editor can edit. */
  unsigned: boolean;
  /** 1-based place in the feed among writings in print; null when spiked. */
  rank: number | null;
  /** 1-based page the layout sets it on; null when spiked. */
  page: number | null;
  /** Whether it is the cover story, by the editor's choice or the layout's. */
  cover: boolean;
  /** Whether the editor put it on the cover. It stays chosen while spiked, and returns to the cover when restored. */
  pinned: boolean;
  /** A heuristic guess at whether it reads as AI-written, 0 to 1; null for writings from before this existed. */
  aiScore: number | null;
}

/** Everything the desk shows about the paper itself. */
export interface DeskView {
  /** Every writing, in feed order, spiked ones included. */
  files: DeskFile[];
  pages: number;
  coverReason: string | null;
}

export function readDesk(db: InstanceDb, timeZone: string): DeskView {
  const plan = readFeedPlan(db);
  const edits = countEditsByWriting(db);
  const pinned = getInstanceSettings(db).coverWritingId;
  let rank = 0;
  const files = listAllWritings(db).map((writing) => ({
    ...describe(writing, plan, timeZone),
    editsUsed: edits.get(writing.id) ?? 0,
    pinned: writing.id === pinned,
    rank: writing.spikedAt ? null : ++rank,
  }));
  return { files, pages: plan.pages, coverReason: plan.coverReason };
}

function describe(writing: Writing, plan: FeedPlan, timeZone: string): Omit<DeskFile, "editsUsed" | "rank" | "pinned"> {
  const id = String(writing.id);
  const section = sectionOf(writing.title);
  return {
    id: writing.id,
    href: pieceHref(writing),
    headline: section.headline,
    author: writing.author,
    section: section.kicker,
    createdAt: writing.createdAt.toISOString(),
    publishedOn: writing.createdAt.toLocaleDateString("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    words: countWords(writing.body),
    spiked: Boolean(writing.spikedAt),
    unsigned: writing.writerId === null,
    page: plan.pageOf.get(id) ?? null,
    cover: plan.coverId === id,
    aiScore: writing.aiScore,
  };
}

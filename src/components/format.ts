import type { Notice } from "@/core/notices";
import { handleOf } from "@/core/writers/handle";
import type { BoardNotice } from "./BulletinBoard";

const WORDS_PER_MINUTE = 230;

/** A writer's page, from the name on their pieces. */
export function writerHref(name: string): string {
  return `/by/${encodeURIComponent(handleOf(name))}`;
}

/** "Sep 24" for this year, "Sep 24, 2025" otherwise. */
export function formatShortDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

/** "Saturday, September 26, 2026", in `timeZone` (by default, that of wherever this runs). */
export function formatLongDate(date: Date, timeZone?: string): string {
  return date.toLocaleDateString("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

/** A board's notices as the bulletin prints them, each dated in `timeZone`. */
export function toBoardNotices(notices: Notice[], timeZone: string): BoardNotice[] {
  return notices.map((notice) => ({
    id: notice.id,
    text: notice.text,
    date: notice.createdAt.toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric", year: "numeric" }),
    dateTime: notice.createdAt.toISOString(),
  }));
}

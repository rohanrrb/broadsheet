/**
 * `npm run seed`: replaces the writings, writers, bulletins and comments of the local dev instance
 * (data/dev.sqlite, or BROADSHEET_DB) with the samples in seed-articles.ts.
 * The instance's name and own words are left as its editor set them, except
 * that a paper nobody has named yet is called DEV_NAME.
 *
 * Every sample author but one is a pen name of the kind the paper offers
 * newcomers, two words and a hyphen, so writers' pages have something to
 * show. Their keys are thrown away: nobody can publish or edit as them. The
 * one is DEV_WRITER, whose key is fixed and public so developers can write as
 * them.
 * Writings go through createWriting like any other. Their dates come from
 * broadsheet's own clock, which this script advances with atSimulatedTime so the
 * feed shows a realistic spread of publication dates.
 */
import { mkdirSync } from "node:fs";
import { sql } from "drizzle-orm";
import path from "node:path";
import type { InstanceDb, TiptapDoc } from "../src/core/db";
import { DEFAULT_INSTANCE_NAME, getInstanceSettings, openInstance, updateInstance } from "../src/core/db";
import { postComment } from "../src/core/comments";
import { postNotice } from "../src/core/notices";
import { createWriter, findWriter } from "../src/core/writers";
import { createWriting, type Writing } from "../src/core/writings";
import { hashKey } from "../src/server/editorKey";
import { normalizeDoc } from "../src/editor/schema";
import { registerWriter } from "../src/server/writers";
import { SEED_ARTICLES, type SeedArticle } from "./seed-articles";
import { atSimulatedTime } from "./simulated-clock";

/**
 * The one sample writer anyone can write as. The credential is public, here
 * and in CLAUDE.md, so it must never guard anything but a dev database.
 */
const DEV_WRITER = { name: "magma", key: "ember-flint-cinder-granite-comet-harbor" };

/** A proof is a trial printing, pulled to see how the page looks before the run: which is what this paper is. */
const DEV_NAME = "The Proof";

/** What the dev writer and the paper have pinned to their bulletins, newest first. */
const DEV_WRITER_NOTICES = [
  "Away from the desk until the end of the month. Letters will be answered in November.",
  "The second part of the harbor series is written and waiting on photographs.",
  "I write here about coastlines, weather and the people who work in both.",
];
const PAPER_NOTICES = [
  "This is a sample paper. Everything in it was made up to try the page on.",
  "Writers can now keep a bulletin of their own, above their name.",
];

/** What readers say, set beside the newest pieces. The newest gets enough to page through. */
const SAMPLE_COMMENTS = [
  "This is the best thing I have read here this month.",
  "I disagree with the second half, but the first half is exactly right.",
  "My grandmother said the same thing about the ferry, almost word for word.",
  "Is there a source for the figure in the fourth paragraph? I could not find it.",
  "Lovely.\n\nThough I would have liked to hear more about the people who were there before.",
  "Printed this out and left it on the table at work. Two people have asked who wrote it.",
  "The headline undersells it.",
  "I have walked that route every day for eleven years and never once noticed what you describe. Tomorrow I will look.",
];
const COMMENTS_ON_NEWEST = 75;
const COMMENTS_ON_OTHERS = [6, 2];

const DB_PATH = process.env.BROADSHEET_DB ?? path.join(process.cwd(), "data", "dev.sqlite");
const HOUR_MS = 60 * 60 * 1000;

function main(): void {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = openInstance(DB_PATH);
  if (getInstanceSettings(db).name === DEFAULT_INSTANCE_NAME) updateInstance(db, { name: DEV_NAME });
  clearWritings(db);
  const writerIds = registerAuthors(db, SEED_ARTICLES);
  const dates = publicationDates(SEED_ARTICLES.length, Date.now());

  // Oldest first, so each new writing lands on top of the feed.
  const pieces = [...SEED_ARTICLES].reverse().map((article, i) => {
    const when = dates[SEED_ARTICLES.length - 1 - i];
    const writerId = writerIds.get(article.author);
    return atSimulatedTime(when, () => createWriting(db, { ...toNewWriting(article), writerId }));
  });
  const newestFirst = pieces.reverse();
  [COMMENTS_ON_NEWEST, ...COMMENTS_ON_OTHERS].forEach((count, i) => {
    if (newestFirst[i]) postComments(db, newestFirst[i], [...writerIds], count);
  });

  postNotices(db, null, PAPER_NOTICES);
  postNotices(db, writerIds.get(DEV_WRITER.name) ?? null, DEV_WRITER_NOTICES);

  console.log(`Seeded ${SEED_ARTICLES.length} writings by ${writerIds.size} writers into ${DB_PATH}`);
  console.log(`Write as ${DEV_WRITER.name} with the credential ${DEV_WRITER.key}`);
}

/** Empties the instance of writings and writers and restarts their numbering. Its name and own words stay. */
function clearWritings(db: InstanceDb): void {
  db.run(sql`DELETE FROM comments`);
  db.run(sql`DELETE FROM notices`);
  db.run(sql`DELETE FROM writing_edits`);
  db.run(sql`DELETE FROM writings`);
  db.run(sql`DELETE FROM writers`);
  db.run(sql`DELETE FROM sqlite_sequence WHERE name IN ('writings', 'writing_edits', 'writers', 'comments')`);
}

/** Pins `texts` to a board a few days apart, the first of them yesterday. */
function postNotices(db: InstanceDb, board: number | null, texts: string[]): void {
  [...texts].reverse().forEach((text, i) => {
    postNotice(db, board, text, new Date(Date.now() - (1 + (texts.length - 1 - i) * 4) * 24 * HOUR_MS));
  });
}

/** `count` sample comments on a piece, by the sample writers in turn, a few minutes apart since it was published. */
function postComments(db: InstanceDb, piece: Writing, writers: [string, number][], count: number): void {
  const others = writers.filter(([name]) => name !== piece.author);
  const span = Math.max(Date.now() - piece.createdAt.getTime(), 1);
  for (let i = 0; i < count; i++) {
    const [author, writerId] = others[(i * 5) % others.length];
    const text = SAMPLE_COMMENTS[(i * 3) % SAMPLE_COMMENTS.length];
    const at = new Date(piece.createdAt.getTime() + (span * (i + 1)) / (count + 1));
    postComment(db, { writingId: piece.id, writerId, author, text }, at);
  }
}

/** A pen name for each sample author, by the name on their pieces. Only the dev writer's key is kept. */
function registerAuthors(db: InstanceDb, articles: SeedArticle[]): Map<string, number> {
  const ids = new Map<string, number>();
  for (const name of new Set(articles.map((article) => article.author))) {
    if (name === DEV_WRITER.name) {
      createWriter(db, { name, keyHash: hashKey(DEV_WRITER.key) });
    } else {
      const result = registerWriter(db, { name });
      if (!result.ok) throw new Error(`${name}: ${result.error}`);
    }
    ids.set(name, findWriter(db, name)!.id);
  }
  return ids;
}

/** Newest first: an hour ago, then irregular gaps of 5 to 35 hours going back. */
function publicationDates(count: number, now: number): Date[] {
  const dates: Date[] = [];
  let time = now - HOUR_MS;
  for (let i = 0; i < count; i++) {
    dates.push(new Date(time));
    time -= (5 + ((i * 37) % 31)) * HOUR_MS;
  }
  return dates;
}

function toNewWriting(article: SeedArticle) {
  // Normalized as a published piece's body is, so a sample compares equal to itself when saved unchanged.
  return { title: article.title, author: article.author, body: normalizeDoc(toTiptap(article)) };
}

function toTiptap(article: SeedArticle): TiptapDoc {
  const image = article.image
    ? [{ type: "image", attrs: { src: picsum(article.image), alt: article.caption ?? article.title } }]
    : [];
  return { type: "doc", content: [...image, ...article.paragraphs.map(toBlockNode)] };
}

function toBlockNode(line: string) {
  if (line.startsWith("## ")) {
    return { type: "heading", attrs: { level: 2 }, content: [textNode(line.slice(3))] };
  }
  if (line.startsWith("> ")) {
    return { type: "blockquote", content: [{ type: "paragraph", content: [textNode(line.slice(2))] }] };
  }
  return { type: "paragraph", content: [textNode(line)] };
}

function textNode(text: string) {
  return { type: "text", text };
}

function picsum(seed: string): string {
  return `https://picsum.photos/seed/${seed}/1200/800`;
}

main();

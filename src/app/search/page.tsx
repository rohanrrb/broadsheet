import type { Metadata } from "next";
import Link from "next/link";
import { getInstanceSettings } from "@/core/db";
import { searchWritings } from "@/feed/search";
import { sectionOf } from "@/feed/sections";
import { getInstance } from "@/server/instance";
import { todayConfig } from "@/widgets/config";
import { RunningHead, WriteLink } from "@/components/RunningHead";
import { SearchBar } from "@/components/SearchBar";
import note from "@/components/PaperNote.module.css";
import { writerHref } from "@/components/format";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Search" };

/** What the paper has in print for a query: the search field again, then headlines, writers and dates. */
export default async function SearchPage(props: PageProps<"/search">) {
  const raw = (await props.searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const db = getInstance();
  const results = searchWritings(db, query);
  const { timeZone } = todayConfig().location;

  return (
    <main className="paper">
      <RunningHead name={getInstanceSettings(db).name} end={<WriteLink />} />
      <article className={note.note}>
        <div className={styles.field}>
          <SearchBar query={query} />
        </div>
        {query && results.length === 0 && <p className={styles.none}>Nothing in print matches “{query}”.</p>}
        <ol className={styles.results}>
          {results.map((piece) => (
            <li key={piece.id}>
              <Link href={`/w/${piece.id}`}>{sectionOf(piece.title).headline}</Link>
              <span className={styles.meta}>
                {piece.writerId ? <Link href={writerHref(piece.author)}>{piece.author}</Link> : piece.author} ·{" "}
                {piece.createdAt.toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric", year: "numeric" })}
              </span>
            </li>
          ))}
        </ol>
      </article>
    </main>
  );
}

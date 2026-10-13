import Link from "next/link";
import { getInstanceSettings } from "@/core/db";
import { getEditHistory, getNeighbours, pieceHref, type Writing, type WritingEdit } from "@/core/writings";
import { isEditor } from "@/server/editorSession";
import { getInstance } from "@/server/instance";
import { todayConfig } from "@/widgets/config";
import type { Place } from "@/feed/place";
import { countWords } from "@/feed/tiptap";
import { Byline } from "./Byline";
import { ClearPlace } from "./ClearPlace";
import { EditedNote } from "./EditedNote";
import { NewWriterNote } from "./NewWriterNote";
import { PieceArrows } from "./PieceArrows";
import { RichText } from "./RichText";
import { RunningHead, WriteLink } from "./RunningHead";
import { OwnEditLink } from "./WriterLinks";
import { formatShortDate, writerHref } from "./format";
import prose from "./Prose.module.css";
import styles from "./PiecePage.module.css";

/**
 * One piece, set to be read: its headline, byline and text, with the way to
 * the pieces either side. Opened from a "Continued on" line, it is given the
 * `place` that line stopped at.
 */
export function PiecePage({ writing, place }: { writing: Writing; place?: Place | null }) {
  const db = getInstance();
  const edits = getEditHistory(db, writing.id);
  const { previous, next } = getNeighbours(db, writing);

  return (
    <main className="paper">
      <RunningHead
        name={getInstanceSettings(db).name}
        start={<span className={styles.folio}>Page W{writing.id}</span>}
        end={
          <>
            <OwnEditLink id={writing.id} owner={writing.writerId ? writing.author : null} />
            <WriteLink />
          </>
        }
      />
      <article className={styles.article}>
        {writing.spikedAt && (
          <p className={styles.spiked}>
            Spiked: readers cannot see this piece. Restore it from <Link href="/desk">the desk</Link>.
          </p>
        )}
        <NewWriterNote />
        <h1 className={styles.title}>{writing.title}</h1>
        <Byline
          author={writing.author}
          href={writing.writerId ? writerHref(writing.author) : undefined}
          createdAt={writing.createdAt.toISOString()}
          wordCount={countWords(writing.body)}
          edited={edits.length > 0 && <Edited edits={edits} />}
        />
        <RichText doc={writing.body} headline={writing.title} place={place} className={`${styles.body} ${prose.prose}`} />
        {place && <ClearPlace />}
      </article>
      <PieceArrows previous={previous && arrowTo(previous)} next={next && arrowTo(next)} />
    </main>
  );
}

const arrowTo = (piece: Writing) => ({ title: piece.title, href: pieceHref(piece) });

/** The byline's note of the latest edit, which opens onto when each one was made, in the paper's time zone. */
function Edited({ edits }: { edits: WritingEdit[] }) {
  const { timeZone } = todayConfig().location;
  return (
    <EditedNote
      latest={formatShortDate(edits[edits.length - 1].editedAt.toISOString())}
      edits={edits.map((edit) => ({
        at: edit.editedAt.toLocaleString("en-US", { timeZone, dateStyle: "medium", timeStyle: "short" }),
        dateTime: edit.editedAt.toISOString(),
      }))}
    />
  );
}

/** The writing, unless it is not there or is spiked; the editor still sees spiked ones. */
export async function inPrint(writing: Writing | undefined): Promise<Writing | undefined> {
  return writing?.spikedAt && !(await isEditor()) ? undefined : writing;
}

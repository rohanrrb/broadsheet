import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getInstanceSettings } from "@/core/db";
import { getEditHistory, getNeighbours, getWriting, type Writing, type WritingEdit } from "@/core/writings";
import { isEditor } from "@/server/editorSession";
import { getInstance } from "@/server/instance";
import { todayConfig } from "@/widgets/config";
import { Byline } from "@/components/Byline";
import { EditedNote } from "@/components/EditedNote";
import { NewWriterNote } from "@/components/NewWriterNote";
import { PieceArrows } from "@/components/PieceArrows";
import { RichText } from "@/components/RichText";
import { RunningHead, WriteLink } from "@/components/RunningHead";
import { OwnEditLink } from "@/components/WriterLinks";
import { formatShortDate, writerHref } from "@/components/format";
import prose from "@/components/Prose.module.css";
import { countWords } from "@/feed/tiptap";
import styles from "./page.module.css";

export async function generateMetadata(props: PageProps<"/w/[id]">): Promise<Metadata> {
  const writing = await findWriting(props.params);
  return { title: writing?.title ?? "Not found" };
}

export default async function WritingPage(props: PageProps<"/w/[id]">) {
  const writing = await findWriting(props.params);
  if (!writing) notFound();
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
        <RichText doc={writing.body} headline={writing.title} className={`${styles.body} ${prose.prose}`} />
      </article>
      <PieceArrows previous={previous} next={next} />
    </main>
  );
}

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

/** The writing, unless it does not exist or is spiked; the editor still sees spiked ones. */
async function findWriting(params: Promise<{ id: string }>): Promise<Writing | undefined> {
  const id = Number((await params).id);
  const writing = Number.isSafeInteger(id) && id > 0 ? getWriting(getInstance(), id) : undefined;
  return writing?.spikedAt && !(await isEditor()) ? undefined : writing;
}

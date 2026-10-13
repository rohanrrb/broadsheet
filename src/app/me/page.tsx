import type { Metadata } from "next";
import { getInstanceSettings } from "@/core/db";
import { getInstance } from "@/server/instance";
import { RunningHead, WriteLink } from "@/components/RunningHead";
import { WriterDoor } from "@/components/WriterDoor";
import note from "@/components/PaperNote.module.css";

export const metadata: Metadata = { title: "My pieces" };

/**
 * Where "My pieces" leads. A writer this browser remembers goes straight on
 * to their own page; anyone else is asked for a pen name and its key, or can
 * take a new name. Which of those it is, only the browser knows.
 */
export default function MyPiecesPage() {
  return (
    <main className="paper">
      <RunningHead name={getInstanceSettings(getInstance()).name} end={<WriteLink />} />
      <article className={note.note}>
        <WriterDoor />
      </article>
    </main>
  );
}

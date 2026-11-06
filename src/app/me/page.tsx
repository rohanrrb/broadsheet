import type { Metadata } from "next";
import { getInstanceSettings } from "@/core/db";
import { getInstance } from "@/server/instance";
import { RunningHead, WriteLink } from "@/components/RunningHead";
import { WriterDoor } from "@/components/WriterDoor";
import note from "@/components/PaperNote.module.css";

export const metadata: Metadata = { title: "My pieces" };

/**
 * Where "My pieces" leads. A writer this browser remembers goes straight on
 * to their own page, or back to `then`, a page of the paper they came from;
 * anyone else is asked for a pen name and its key, or can take a new name.
 * Which of those it is, only the browser knows.
 */
export default async function MyPiecesPage(props: PageProps<"/me">) {
  const then = ownPath((await props.searchParams).then);
  return (
    <main className="paper">
      <RunningHead name={getInstanceSettings(getInstance()).name} end={<WriteLink />} />
      <article className={note.note}>
        <WriterDoor then={then} />
      </article>
    </main>
  );
}

/** A path on this paper, or undefined: never another site, which "//host" and "/\\host" would be. */
function ownPath(raw: string | string[] | undefined): string | undefined {
  return typeof raw === "string" && /^\/(?![/\\])/.test(raw) ? raw : undefined;
}

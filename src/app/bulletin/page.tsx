import type { Metadata } from "next";
import { getInstanceSettings } from "@/core/db";
import { listNotices } from "@/core/notices";
import { isEditor } from "@/server/editorSession";
import { getInstance } from "@/server/instance";
import { todayConfig } from "@/widgets/config";
import { BulletinBoard } from "@/components/BulletinBoard";
import { RunningHead, WriteLink } from "@/components/RunningHead";
import { toBoardNotices } from "@/components/format";
import note from "@/components/PaperNote.module.css";

export const metadata: Metadata = { title: "Bulletin" };

/** The paper's own bulletin: what its editor has to tell readers. Reading the session cookie makes this render per request. */
export default async function PaperBulletinPage() {
  const db = getInstance();
  return (
    <main className="paper">
      <RunningHead name={getInstanceSettings(db).name} end={<WriteLink />} />
      <article className={note.note}>
        <h1 className={note.title}>Bulletin</h1>
        <BulletinBoard
          notices={toBoardNotices(listNotices(db, null), todayConfig().location.timeZone)}
          editor={await isEditor()}
        />
      </article>
    </main>
  );
}

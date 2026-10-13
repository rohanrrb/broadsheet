import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getInstanceSettings } from "@/core/db";
import { listNotices } from "@/core/notices";
import { findWriter } from "@/core/writers";
import { isEditor } from "@/server/editorSession";
import { getInstance } from "@/server/instance";
import { todayConfig } from "@/widgets/config";
import { BulletinBoard } from "@/components/BulletinBoard";
import { RunningHead, WriteLink } from "@/components/RunningHead";
import { toBoardNotices } from "@/components/format";
import note from "@/components/PaperNote.module.css";

export async function generateMetadata(props: PageProps<"/by/[name]/bulletin">): Promise<Metadata> {
  const writer = findWriter(getInstance(), decodeURIComponent((await props.params).name));
  return { title: writer ? `${writer.name}: Bulletin` : "Not found" };
}

/** A writer's bulletin: their short notices to readers, newest first. */
export default async function WriterBulletinPage(props: PageProps<"/by/[name]/bulletin">) {
  const db = getInstance();
  const writer = findWriter(db, decodeURIComponent((await props.params).name));
  if (!writer) notFound();

  return (
    <main className="paper">
      <RunningHead
        name={getInstanceSettings(db).name}
        start={<Link href={`/by/${writer.handle}`}>{writer.name}</Link>}
        end={<WriteLink />}
      />
      <article className={note.note}>
        <h1 className={note.title}>Bulletin</h1>
        <BulletinBoard
          notices={toBoardNotices(listNotices(db, writer.id), todayConfig().location.timeZone)}
          writer={writer.name}
          editor={await isEditor()}
        />
      </article>
    </main>
  );
}

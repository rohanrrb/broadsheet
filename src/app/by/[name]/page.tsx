import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInstanceSettings } from "@/core/db";
import { listNotices } from "@/core/notices";
import { findWriter } from "@/core/writers";
import { readWriterPage, writerHasCoverPiece } from "@/feed/feed";
import { getInstance } from "@/server/instance";
import { todayConfig } from "@/widgets/config";
import { BulletinLine } from "@/components/BulletinLine";
import { CoverNudge } from "@/components/CoverNudge";
import { InfiniteFeed } from "@/components/InfiniteFeed";
import { PageSheet } from "@/components/PageSheet";
import { Masthead } from "@/components/Masthead";

export async function generateMetadata(props: PageProps<"/by/[name]">): Promise<Metadata> {
  const writer = findWriter(getInstance(), decodeURIComponent((await props.params).name));
  return { title: writer?.name ?? "Not found" };
}

/**
 * A writer's page: the paper's front page, kept to one writer. Their name runs
 * into the nameplate ("magma on" the paper's name), over everything in print
 * under it, and their bulletin runs in a line above it. Beyond those there is
 * nothing to show, by design. Who a writer is, is what they have written.
 */
export default async function WriterPage(props: PageProps<"/by/[name]">) {
  const db = getInstance();
  const writer = findWriter(db, decodeURIComponent((await props.params).name));
  if (!writer) notFound();
  const { name } = getInstanceSettings(db);
  const page = readWriterPage(db, writer.id);
  const { timeZone } = todayConfig().location;
  const today = new Date();

  return (
    <main className="paper">
      <Masthead
        name={name}
        today={today}
        timeZone={timeZone}
        earLeft=""
        earRight=""
        strip={
          <BulletinLine
            notices={listNotices(db, writer.id)}
            timeZone={timeZone}
            href={`/by/${writer.handle}/bulletin`}
          />
        }
        writer={writer.name}
      />
      {page.modules.length > 0 ? (
        <>
          {!writerHasCoverPiece(db, writer.id) && <CoverNudge owner={writer.name} />}
          <PageSheet page={page} />
          <InfiniteFeed name={name} timeZone={timeZone} initialCursor={page.nextCursor} />
        </>
      ) : (
        <p className="empty">Nothing in print yet.</p>
      )}
    </main>
  );
}

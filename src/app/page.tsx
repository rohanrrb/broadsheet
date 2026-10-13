import Link from "next/link";
import { connection } from "next/server";
import { getInstanceSettings } from "@/core/db";
import { listNotices } from "@/core/notices";
import { readFeedPage } from "@/feed/feed";
import { getInstance } from "@/server/instance";
import { todayConfig } from "@/widgets/config";
import { ComicStrip } from "@/components/ComicStrip";
import { BulletinLine } from "@/components/BulletinLine";
import { PageSheet } from "@/components/PageSheet";
import { InfiniteFeed } from "@/components/InfiniteFeed";
import { Masthead } from "@/components/Masthead";

export default async function Home() {
  // The feed lives in SQLite and changes as people publish: render per request.
  await connection();
  const db = getInstance();
  const { name, earLeft, earRight, comicImage, comicLink, comicCredit } = getInstanceSettings(db);
  const page = readFeedPage(db);
  const today = new Date();
  const { timeZone } = todayConfig().location;

  return (
    <main className="paper">
      <Masthead
        name={name}
        today={today}
        timeZone={timeZone}
        earLeft={earLeft}
        earRight={earRight}
        strip={<BulletinLine notices={listNotices(db, null)} timeZone={timeZone} href="/bulletin" />}
      />
      {page.modules.length > 0 ? <PageSheet page={page} /> : <EmptyFeed />}
      {comicImage && <ComicStrip image={comicImage} link={comicLink} credit={comicCredit} />}
      {page.modules.length > 0 && <InfiniteFeed name={name} timeZone={timeZone} initialCursor={page.nextCursor} />}
    </main>
  );
}

function EmptyFeed() {
  return (
    <p className="empty">
      Nothing has been published yet. <Link href="/write">Write the first piece</Link>, or in development run{" "}
      <code>npm run seed</code>.
    </p>
  );
}

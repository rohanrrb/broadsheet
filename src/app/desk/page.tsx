import type { Metadata } from "next";
import Link from "next/link";
import { getInstanceSettings } from "@/core/db";
import { readDesk } from "@/desk/files";
import { MIN_EDITOR_KEY_LENGTH } from "@/server/editorKey";
import { currentAccess, isEditor } from "@/server/editorSession";
import { getInstance } from "@/server/instance";
import { todayConfig } from "@/widgets/config";
import { Desk } from "@/components/desk/Desk";
import { DeskLinks } from "@/components/desk/DeskLinks";
import { ClaimForm } from "@/components/desk/ClaimForm";
import { KeyForm } from "@/components/desk/KeyForm";
import { SignOut } from "@/components/desk/SignOut";
import { RunningHead, WriteLink } from "@/components/RunningHead";
import head from "@/components/RunningHead.module.css";
import styles from "@/components/desk/Desk.module.css";

export const metadata: Metadata = { title: "The Desk", robots: { index: false } };

/** The editor's desk. Reading the session cookie makes this render per request. */
export default async function DeskPage() {
  const signedIn = await isEditor();
  const db = getInstance();
  const { name } = getInstanceSettings(db);
  if (!signedIn) return <Door name={name} unclaimed={currentAccess().kind === "unclaimed"} />;

  const today = todayConfig();
  const view = readDesk(db, today.location.timeZone);
  const inPrint = view.files.filter((f) => !f.spiked);

  return (
    <main className="paper">
      <RunningHead
        name={name}
        start={<span className={styles.label}>The Desk</span>}
        end={
          <>
            <Link href="/bulletin" className={head.write}>
              Bulletin
            </Link>
            <WriteLink />
            <SignOut />
          </>
        }
      />
      <header className={styles.intro}>
        <h1 className={styles.title}>The Desk</h1>
        <p className={styles.summary}>
          {inPrint.length} in print across {view.pages} {view.pages === 1 ? "page" : "pages"}
          {view.files.length > inPrint.length && ` · ${view.files.length - inPrint.length} spiked`}
        </p>
      </header>
      <Desk instanceName={name} files={view.files} />
      <DeskLinks />
    </main>
  );
}

/** What everyone but the signed-in editor sees: the key form, or for a new paper, the way to claim it. */
function Door({ name, unclaimed }: { name: string; unclaimed: boolean }) {
  return (
    <main className="paper">
      <RunningHead name={name} start={<span className={styles.label}>The Desk</span>} />
      <div className={styles.door}>
        <h1 className={styles.title}>{unclaimed ? "Claim this paper" : "The Desk"}</h1>
        {unclaimed ? (
          <>
            <p className={styles.doorNote}>
              This paper has no editor yet. If you set it up, it is yours to claim. broadsheet printed a one-time code
              to this paper’s server log: open the log on your host’s dashboard, find the line
              beginning <code className={styles.envVar}>[broadsheet]</code>, and enter the code here.
            </p>
            <ClaimForm minKeyLength={MIN_EDITOR_KEY_LENGTH} />
          </>
        ) : (
          <>
            <p className={styles.doorNote}>For this paper’s editor. Enter your editor key.</p>
            <KeyForm />
          </>
        )}
      </div>
    </main>
  );
}

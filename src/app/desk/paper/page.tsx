import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getInstanceSettings } from "@/core/db";
import { MAX_INSTANCE_NAME_LENGTH, PAPER_COPY_LIMITS } from "@/server/desk";
import { isEditor } from "@/server/editorSession";
import { getInstance } from "@/server/instance";
import { PaperForm } from "@/components/desk/PaperForm";
import { RunningHead } from "@/components/RunningHead";
import styles from "@/components/desk/Desk.module.css";

export const metadata: Metadata = { title: "The Paper", robots: { index: false } };

/** Where the editor names the paper, writes its ears and its About and agents pages, and sets its comic strip. */
export default async function PaperPage() {
  if (!(await isEditor())) redirect("/desk");
  const { name, earLeft, earRight, about, agents, comicImage, comicLink, comicCredit } = getInstanceSettings(getInstance());

  return (
    <main className="paper">
      <RunningHead
        name={name}
        start={
          <Link href="/desk" className={styles.label}>
            ← The Desk
          </Link>
        }
      />
      <div className={styles.copy}>
        <h1 className={styles.title}>The Paper</h1>
        <PaperForm
          paper={{ name, earLeft, earRight, about, agents, comicImage, comicLink, comicCredit }}
          limits={{ name: MAX_INSTANCE_NAME_LENGTH, ...PAPER_COPY_LIMITS }}
        />
      </div>
    </main>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { MyPiecesLink, WritePageLink } from "./WriterLinks";
import styles from "./RunningHead.module.css";

interface RunningHeadProps {
  /** The instance's name, set in the blackletter nameplate. */
  name: string;
  /** Left of the nameplate: where the reader is, e.g. "Page 2" or "Page W12". */
  start?: ReactNode;
  /** Right of the nameplate: the date, the Write link, or the editor's action. */
  end?: ReactNode;
}

/**
 * The compact masthead every surface wears but the front page and a writer's
 * page: the same nameplate between two small-caps slots, closed by the same
 * double rule as the front page's dateline. Those two set the full version
 * (Masthead).
 */
export function RunningHead({ name, start, end }: RunningHeadProps) {
  return (
    <header className={styles.head}>
      <div className={styles.start}>{start}</div>
      <Link href="/" className={styles.nameplate}>
        {name}
      </Link>
      <div className={styles.end}>{end}</div>
    </header>
  );
}

/**
 * The ways in for writers: quiet, but always in the same corner. "My pieces"
 * leads a writer to their own page; a browser that does not know them yet is
 * shown "Sign in" there instead. `onPageOf` names the writer whose page this is, if it is
 * one; there, only that writer is shown Write.
 */
export function WriteLink({ onPageOf }: { onPageOf?: string }) {
  return (
    <>
      <MyPiecesLink onPageOf={onPageOf} />
      <WritePageLink onPageOf={onPageOf} />
    </>
  );
}

/** What this paper is and how to run one's own: beside Write on the front page. */
export function AboutLink() {
  return (
    <Link href="/about" className={styles.write}>
      About
    </Link>
  );
}

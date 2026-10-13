import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { PaperClock } from "./PaperClock";
import { PaperDate } from "./PaperDate";
import { RunningHead, AboutLink, WriteLink } from "./RunningHead";
import styles from "./Masthead.module.css";

interface MastheadProps {
  /** The instance's name, set in the nameplate. */
  name: string;
  today: Date;
  /** The paper's time zone: the dateline shows its date and time until the reader's own are known. */
  timeZone: string;
  /** The editor's words either side of the nameplate; an empty ear is left blank. */
  earLeft: string;
  earRight: string;
  /** Set above the nameplate: the bulletin line. */
  strip?: ReactNode;
  /**
   * On a writer's page, the writer. Their name runs into the nameplate from
   * its left, as in "magma on" before the paper's name, in place of both ears.
   */
  writer?: string;
}

/** The head of the front page and of a writer's page: the bulletin line, the nameplate, and the dateline. */
export function Masthead({ name, today, timeZone, earLeft, earRight, strip, writer }: MastheadProps) {
  const lead = writer && `${writer} on`;
  const nameplate = (
    <p className={styles.nameplate}>
      <Link href="/">{name}</Link>
    </p>
  );
  return (
    <header className={styles.masthead}>
      {strip}
      {lead ? (
        <div className={`${styles.plate} ${styles.led}`}>
          <h1 className={styles.lead} style={{ "--lead-ems": widthInEms(lead) } as CSSProperties}>
            <span>{lead}</span>
          </h1>
          {nameplate}
          <span />
        </div>
      ) : (
        <div className={styles.plate}>
          {earLeft ? <p className={`${styles.ear} ${styles.motto}`}>{earLeft}</p> : <span />}
          {nameplate}
          <RightEar text={earRight} />
        </div>
      )}
      <div className={styles.dateline}>
        <span>
          <PaperClock date={today} timeZone={timeZone} />
        </span>
        <span className={styles.date}>
          <PaperDate date={today} timeZone={timeZone} />
        </span>
        <span className={styles.datelineEnd}>
          {/* About is the paper's; on a writer's page it would read as theirs. */}
          {!writer && <AboutLink />}
          <WriteLink onPageOf={writer} />
        </span>
      </div>
    </header>
  );
}

/**
 * The most room a line of the display face can take, in ems: the widest letter
 * of each kind, measured, so type sized by it never overruns its column.
 */
function widthInEms(text: string): number {
  return Array.from(text, emsOf).reduce((sum, ems) => sum + ems, 0);
}

function emsOf(character: string): number {
  if (/[mwMW]/.test(character)) return 0.91;
  if (/[ijltfIJ1 ]/.test(character)) return 0.36;
  if (/[A-Z]/.test(character)) return 0.76;
  if (/[a-z0-9_-]/.test(character)) return 0.6;
  return 1;
}

/** The editor's words right of the nameplate: a first line set bold, then a note. */
function RightEar({ text }: { text: string }) {
  if (!text) return <span />;
  const [title, ...note] = text.split("\n");
  return (
    <p className={`${styles.ear} ${styles.earRight}`}>
      <strong>{title}</strong>
      {note.join("\n")}
    </p>
  );
}

interface PageFolioProps {
  name: string;
  index: number;
  today: Date;
  timeZone: string;
}

/** Opens each later page of the feed: the compact masthead with page and date. */
export function PageFolio({ name, index, today, timeZone }: PageFolioProps) {
  return (
    <div className={styles.folio}>
      <RunningHead
        name={name}
        start={<span className={styles.folioPage}>Page {index + 1}</span>}
        end={<PaperDate date={today} timeZone={timeZone} />}
      />
    </div>
  );
}

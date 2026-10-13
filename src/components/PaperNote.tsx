import type { ReactNode } from "react";
import { markdownToWriting } from "@/editor/import/markdown";
import { RichText } from "./RichText";
import { RunningHead, WriteLink } from "./RunningHead";
import styles from "./PaperNote.module.css";

interface PaperNoteProps {
  /** The instance's name, for the running head. */
  name: string;
  title: string;
  /** The editor's words, in Markdown. */
  markdown: string;
  /** Set after the editor's words, in the same type. */
  children?: ReactNode;
}

/**
 * One of the paper's own pages (About, Agent Directive): a heading and a few
 * paragraphs written by its editor, and nothing else.
 */
export function PaperNote({ name, title, markdown, children }: PaperNoteProps) {
  return (
    <main className="paper">
      <RunningHead name={name} end={<WriteLink />} />
      <article className={styles.note}>
        <h1 className={styles.title}>{title}</h1>
        <RichText doc={markdownToWriting(markdown).body} />
        {children}
      </article>
    </main>
  );
}

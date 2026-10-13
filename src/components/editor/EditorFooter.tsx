import type { ReactNode } from "react";
import { readingMinutes } from "@/components/format";
import styles from "./WritingEditor.module.css";

interface EditorFooterProps {
  wordCount: number;
  /** Quiet status on the right: draft saved, draft restored, import results. */
  status?: ReactNode;
}

export function EditorFooter({ wordCount, status }: EditorFooterProps) {
  return (
    <footer className={styles.footer}>
      <span>
        {wordCount.toLocaleString("en-US")} {wordCount === 1 ? "word" : "words"} · {readingMinutes(wordCount)} min read
      </span>
      <span className={styles.footerStatus} aria-live="polite">
        {status}
      </span>
    </footer>
  );
}

"use client";

import { useState } from "react";
import type { Identity } from "@/editor/identity";
import styles from "./KeyCard.module.css";

/**
 * A writer's key, set as a run of text so it can sit inside a paragraph or a
 * menu. With `startHidden` it is kept out of sight until asked for, so it is
 * not read over a shoulder or caught in a screenshot; once shown it can be
 * copied in one press.
 */
export function KeyCard({ identity, startHidden = false }: { identity: Identity; startHidden?: boolean }) {
  const [shown, setShown] = useState(!startHidden);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(identity.key).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 700);
  };

  if (!shown) {
    return (
      <span className={styles.keyCard}>
        <button type="button" className={styles.keyReveal} onClick={() => setShown(true)}>
          show credential
        </button>
      </span>
    );
  }
  return (
    <span className={styles.keyCard}>
      <code className={styles.keyWords}>{identity.key}</code>
      <button type="button" className={styles.keyCopy} data-done={copied || undefined} onClick={copy} aria-label="Copy credential">
        <CopyIcon />
        <span>copy</span>
      </button>
    </span>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" aria-hidden>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.5" />
    </svg>
  );
}

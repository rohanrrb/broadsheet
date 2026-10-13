"use client";

import { useEffect, useState } from "react";
import { KeyCard } from "./KeyCard";
import { useIdentity } from "./editor/useIdentity";
import styles from "./NewWriterNote.module.css";

/** Set by the editor when a brand-new writer's first piece goes out; read once here. */
export const NEW_WRITER_FLAG = "broadsheet:new-writer";

/**
 * Greets a writer on the piece that made them one, and hands over their key.
 * It appears once: the flag is cleared as it is read, so a reload or a later
 * visit shows the piece alone. The key stays available from the Write page.
 */
export function NewWriterNote() {
  const identity = useIdentity();
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (!window.sessionStorage.getItem(NEW_WRITER_FLAG)) return;
        window.sessionStorage.removeItem(NEW_WRITER_FLAG);
        setFresh(true);
      } catch {
        // A browser that blocks storage has no flag to read.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!fresh || !identity) return null;
  return (
    <div className={styles.note} role="status">
      <p>
        Thank you for contributing! You are now {identity.name}. Below is your secret credential. If you’d like to write as{" "}
        {identity.name} again, keep it safe and secret, as <strong>credentials cannot be recovered</strong>.
      </p>
      <KeyCard identity={identity} startHidden />
    </div>
  );
}

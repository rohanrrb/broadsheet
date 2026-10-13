"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Identity } from "@/editor/identity";
import { KeyCard } from "./KeyCard";
import { forgetIdentity } from "./editor/useIdentity";
import controls from "./editor/controls.module.css";
import styles from "./SignOutPrompt.module.css";

interface SignOutPromptProps {
  identity: Identity;
  /** The control that asks to sign out; it is handed the way to open the prompt. */
  children: (ask: () => void) => ReactNode;
}

/**
 * Asks before the browser forgets a writer, in a small box that drops from
 * the control that was pressed, like the editor's own menus. Signing out
 * cannot be undone from here: with no copy of the credential kept elsewhere
 * the name is lost, so the credential is at hand to copy first.
 */
export function SignOutPrompt({ identity, children }: SignOutPromptProps) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);

  // Escape, or a press anywhere else on the page, puts the box away.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onPress = (event: PointerEvent) => !anchor.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
    };
  }, [open]);

  return (
    <span ref={anchor} className={styles.anchor}>
      {children(() => setOpen(true))}
      {open && (
        <span role="dialog" aria-label="Sign out?" className={styles.box}>
          <span className={styles.question}>Sign out?</span>
          <span className={styles.warning}>You’ll need your credential to sign back in.</span>
          <span className={styles.credential}>
            <KeyCard identity={identity} startHidden />
          </span>
          <span className={styles.actions}>
            <button type="button" className={controls.control} onClick={() => setOpen(false)} autoFocus>
              Cancel
            </button>
            <button type="button" className={`${controls.control} ${styles.confirm}`} onClick={forgetIdentity}>
              Sign out
            </button>
          </span>
        </span>
      )}
    </span>
  );
}

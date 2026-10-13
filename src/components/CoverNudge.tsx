"use client";

import { useSyncExternalStore } from "react";
import { handleOf } from "@/core/writers/handle";
import { browserStorage } from "@/editor/draft";
import { useIdentity } from "./editor/useIdentity";
import styles from "./CoverNudge.module.css";

const HIDDEN_KEY = "broadsheet:cover-nudge-hidden";
const listeners = new Set<() => void>();

/**
 * One quiet line to a writer on their own page, when nothing they have in
 * print would make a decent cover for it. Only their own browser shows it,
 * and "Hide" puts it away for good.
 */
export function CoverNudge({ owner }: { owner: string }) {
  const identity = useIdentity();
  const hidden = useSyncExternalStore(subscribe, isHidden, () => true);
  if (hidden || !identity || handleOf(identity.name) !== handleOf(owner)) return null;
  return (
    <p className={styles.nudge}>
      A piece with a photo would lead this page better.
      <button type="button" className={styles.hide} onClick={hide}>
        Hide
      </button>
    </p>
  );
}

function isHidden(): boolean {
  try {
    return browserStorage()?.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function hide(): void {
  try {
    browserStorage()?.setItem(HIDDEN_KEY, "1");
  } catch {
    // A browser that blocks storage keeps the line; there is nowhere to remember the choice.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { handleOf } from "@/core/writers/handle";
import { SignOutPrompt } from "./SignOutPrompt";
import { useIdentity } from "./editor/useIdentity";
import styles from "./RunningHead.module.css";

/**
 * "My pieces", the way to a writer's own page; in a browser that remembers no
 * writer the same link reads "Sign in", since that is what it leads to. On the
 * writer's own page, in their own browser, it has nowhere to lead, and becomes
 * the way out: "Sign out", which makes the browser forget them.
 */
export function MyPiecesLink({ onPageOf }: { onPageOf?: string }) {
  const identity = useIdentity();
  const awake = useSyncExternalStore(never, () => true, () => false);
  if (identity && onPageOf && handleOf(identity.name) === handleOf(onPageOf)) {
    return (
      <SignOutPrompt identity={identity}>
        {(ask) => (
          <button type="button" className={`${styles.write} ${styles.asLink} ${styles.own}`} onClick={ask}>
            Sign out
          </button>
        )}
      </SignOutPrompt>
    );
  }
  // Who the browser remembers is not known until the page wakes there; the link keeps its place unseen until then.
  return (
    <Link href="/me" className={`${styles.write} ${styles.own}`} style={awake ? undefined : { visibility: "hidden" }}>
      {identity ? "My pieces" : "Sign in"}
    </Link>
  );
}

const never = () => () => {};

/**
 * "Write". On a writer's page it is shown only in that writer's own browser:
 * to anyone else the page is someone else's, and not a place to write from.
 */
export function WritePageLink({ onPageOf }: { onPageOf?: string }) {
  const identity = useIdentity();
  if (onPageOf && (!identity || handleOf(identity.name) !== handleOf(onPageOf))) return null;
  return (
    <Link href="/write" className={styles.write}>
      Write
    </Link>
  );
}

/** The way into editing a piece, shown only in the browser of the writer whose piece it is. */
export function OwnEditLink({ id, owner }: { id: number; owner: string | null }) {
  const identity = useIdentity();
  if (!identity || !owner || handleOf(identity.name) !== handleOf(owner)) return null;
  return (
    <Link href={`/w/${id}/edit`} className={`${styles.write} ${styles.edit}`}>
      Edit
    </Link>
  );
}

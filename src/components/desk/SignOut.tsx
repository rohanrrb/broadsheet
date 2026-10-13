"use client";

import { useRouter } from "next/navigation";
import { signOut } from "./api";
import head from "../RunningHead.module.css";
import styles from "./Desk.module.css";

/** Ends the editor's session on every browser, this one included. */
export function SignOutEverywhere() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`${styles.plainButton} ${styles.textLink}`}
      onClick={async () => {
        await signOut({ everywhere: true });
        router.refresh();
      }}
    >
      Sign out everywhere
    </button>
  );
}

/** Sits beside Write in the desk's running head, and looks like it. */
export function SignOut() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`${styles.plainButton} ${head.write}`}
      onClick={async () => {
        await signOut();
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

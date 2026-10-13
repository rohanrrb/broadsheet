import Link from "next/link";
import { SignOutEverywhere } from "./SignOut";
import styles from "./Desk.module.css";

/** Under the files: the rest of what the editor can do from the desk. */
export function DeskLinks() {
  return (
    <nav className={styles.deskLinks}>
      <Link href="/desk/paper" className={styles.textLink}>
        Edit the paper
      </Link>
      <a href="/api/desk/backup" className={styles.textLink}>
        Download a backup
      </a>
      <SignOutEverywhere />
    </nav>
  );
}

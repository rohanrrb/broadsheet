import { describeFormats } from "@/editor/import/registry";
import styles from "./WritingEditor.module.css";

/** Shown while a file is dragged over the page. */
export function DropOverlay() {
  return (
    <div className={styles.drop} aria-hidden>
      <p>
        Drop to import
        <span>{describeFormats()}</span>
      </p>
    </div>
  );
}

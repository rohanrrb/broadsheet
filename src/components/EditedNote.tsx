import styles from "./Byline.module.css";

interface EditedNoteProps {
  /** When each edit was made, oldest first, as the paper prints a moment and as a machine reads it. */
  edits: { at: string; dateTime: string }[];
  /** The day of the latest edit, as the byline prints dates. */
  latest: string;
}

/** "Edited Oct 12" in a piece's byline; opening it lists when each edit was made. */
export function EditedNote({ edits, latest }: EditedNoteProps) {
  return (
    <details className={styles.edited}>
      <summary>Edited {latest}</summary>
      <ol className={styles.edits} aria-label="Edit history">
        {[...edits].reverse().map((edit) => (
          <li key={edit.dateTime}>
            <time dateTime={edit.dateTime}>{edit.at}</time>
          </li>
        ))}
      </ol>
    </details>
  );
}

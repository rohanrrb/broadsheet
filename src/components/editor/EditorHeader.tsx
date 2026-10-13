import type { ReactNode } from "react";
import { RunningHead } from "../RunningHead";
import styles from "./WritingEditor.module.css";

interface EditorHeaderProps {
  instanceName: string;
  /** "New writing", "Editing W12". */
  label: string;
  /** The publish or save control, and any message beside it. */
  children?: ReactNode;
}

/**
 * The compact masthead, as on every other surface, with what is being
 * written on the left and the one important button where Write usually sits.
 */
export function EditorHeader({ instanceName, label, children }: EditorHeaderProps) {
  return (
    <div className={styles.headerFrame}>
      <RunningHead
        name={instanceName}
        start={<span className={styles.headerLabel}>{label}</span>}
        end={children}
      />
    </div>
  );
}

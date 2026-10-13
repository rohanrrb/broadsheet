import type { DraftState } from "./useDraft";
import styles from "./WritingEditor.module.css";

/** "Draft saved 8:42 PM", or an offer to discard a restored draft. */
export function DraftStatus({ state, onDiscard }: { state: DraftState; onDiscard: () => void }) {
  if (state.kind === "idle") return null;
  if (state.kind === "saved") return <>Draft saved in this browser · {clock(state.at)}</>;
  return (
    <>
      Restored your unsaved draft from {clock(state.at)} ·{" "}
      <button type="button" className={styles.linkButton} onClick={onDiscard}>
        Discard
      </button>
    </>
  );
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

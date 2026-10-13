import styles from "./WritingEditor.module.css";

interface PublishControlsProps {
  editing: boolean;
  saving: boolean;
  disabled: boolean;
  onPublish: () => void;
}

/** Publish, or Save edit. */
export function PublishControls({ editing, saving, disabled, onPublish }: PublishControlsProps) {
  return (
    <button
      type="button"
      className={styles.primary}
      onClick={onPublish}
      disabled={disabled || saving}
      title={editing && disabled ? "No changes to save yet" : undefined}
    >
      {saving ? (editing ? "Saving…" : "Publishing…") : editing ? "Save edit" : "Publish"}
    </button>
  );
}

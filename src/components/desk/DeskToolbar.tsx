import Link from "next/link";
import type { DeskFile } from "@/desk/files";
import type { Placement } from "@/desk/folders";
import controls from "../editor/controls.module.css";
import styles from "./Desk.module.css";

interface DeskToolbarProps {
  /** The open folder's files as listed, which is what "up" and "down" mean. */
  listed: DeskFile[];
  selected: DeskFile | null;
  /** Absent when the list is not in feed order, or a change is under way. */
  onMove?: (id: number, placement: Placement) => void;
  /** Absent while a change is under way. */
  onSpike?: (id: number, spiked: boolean) => void;
  /** Absent while a change is under way. */
  onCover?: (id: number, cover: boolean) => void;
}

/** What the editor can do with the selected writing. */
export function DeskToolbar({ listed, selected, onMove, onSpike, onCover }: DeskToolbarProps) {
  const index = selected ? listed.indexOf(selected) : -1;
  const [first, previous, next, last] = [listed[0], listed[index - 1], listed[index + 1], listed[listed.length - 1]];

  const moveButton = (label: string, anchor: DeskFile | undefined, edge: "above" | "below") => (
    <button
      type="button"
      className={controls.control}
      disabled={!selected || !onMove || !anchor || anchor === selected}
      onClick={() => selected && anchor && onMove?.(selected.id, edge === "above" ? { above: anchor.id } : { below: anchor.id })}
    >
      {label}
    </button>
  );

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Selected writing">
      <div className={controls.group}>
        {moveButton("To top", first, "above")}
        {moveButton("Up", previous, "above")}
        {moveButton("Down", next, "below")}
        {moveButton("To bottom", last, "below")}
      </div>
      <span className={controls.divider} />
      <div className={controls.group}>
        <FileLink href={selected && !selected.spiked ? selected.href : null}>Read</FileLink>
        {/* A writer's piece is theirs alone to edit; only one with no writer is the editor's. */}
        {selected?.unsigned && <FileLink href={`/w/${selected.id}/edit`}>Edit</FileLink>}
      </div>
      <span className={controls.divider} />
      <button
        type="button"
        className={controls.control}
        disabled={!selected || selected.spiked || !onCover}
        onClick={() => selected && onCover?.(selected.id, !selected.pinned)}
      >
        {selected?.pinned ? "Take off the cover" : "Make cover"}
      </button>
      <span className={controls.divider} />
      <button
        type="button"
        className={controls.control}
        disabled={!selected || !onSpike}
        onClick={() => selected && onSpike?.(selected.id, !selected.spiked)}
      >
        {selected?.spiked ? "Restore to the paper" : "Spike"}
      </button>
    </div>
  );
}

function FileLink({ href, children }: { href: string | null; children: string }) {
  if (!href) {
    return (
      <button type="button" className={controls.control} disabled>
        {children}
      </button>
    );
  }
  return (
    <Link href={href} className={controls.control}>
      {children}
    </Link>
  );
}

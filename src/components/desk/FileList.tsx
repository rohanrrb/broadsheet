import { useState, type DragEvent, type KeyboardEvent } from "react";
import type { DeskFile } from "@/desk/files";
import type { Placement, Sort, SortKey } from "@/desk/folders";
import styles from "./Desk.module.css";

interface FileListProps {
  files: DeskFile[];
  sort: Sort;
  onSort: (key: SortKey) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onOpen: (id: number) => void;
  /** Present only when stories can be moved: in feed order, and not mid-change. */
  onMove?: (id: number, placement: Placement) => void;
}

interface Column {
  key: SortKey;
  label: string;
  /** Narrow screens keep only the columns an editor cannot do without. */
  className?: string;
}

const COLUMNS: Column[] = [
  { key: "order", label: "№", className: styles.num },
  { key: "headline", label: "Headline" },
  { key: "author", label: "Writer", className: styles.wide },
  { key: "section", label: "Section", className: styles.wide },
  { key: "date", label: "Published", className: styles.medium },
  { key: "words", label: "Words", className: `${styles.num} ${styles.wide}` },
  { key: "edits", label: "Edits", className: `${styles.num} ${styles.medium}` },
];

type DropEdge = "above" | "below";

/** The right pane: one folder's writings as a sortable list of files. */
export function FileList({ files, sort, onSort, selectedId, onSelect, onOpen, onMove }: FileListProps) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [drop, setDrop] = useState<{ id: number; edge: DropEdge } | null>(null);

  function endDrag() {
    setDragId(null);
    setDrop(null);
  }

  function dragOver(event: DragEvent<HTMLTableRowElement>, id: number) {
    if (dragId === null || dragId === id) return setDrop(null);
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    setDrop({ id, edge: event.clientY < box.top + box.height / 2 ? "above" : "below" });
  }

  function dropOn(event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    if (dragId !== null && drop) onMove?.(dragId, toPlacement(drop.edge, drop.id));
    endDrag();
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    const neighbour = files[index + step];
    if (step === 0 || !neighbour) return;
    event.preventDefault();
    if (event.altKey) return onMove?.(files[index].id, toPlacement(step < 0 ? "above" : "below", neighbour.id));
    onSelect(neighbour.id);
    document.getElementById(rowButtonId(neighbour.id))?.focus();
  }

  return (
    <div className={styles.listWrap}>
      <table className={styles.list}>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.key} className={column.className} aria-sort={ariaSort(sort, column.key)}>
                <button type="button" className={styles.sort} onClick={() => onSort(column.key)}>
                  {column.label}
                  <span aria-hidden className={styles.arrow}>
                    {sort.key === column.key ? (sort.descending ? "▾" : "▴") : ""}
                  </span>
                </button>
              </th>
            ))}
            <th className={styles.num}>Page</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, index) => (
            <tr
              key={file.id}
              className={styles.file}
              aria-selected={file.id === selectedId}
              data-drop={drop?.id === file.id ? drop.edge : undefined}
              data-dragging={dragId === file.id || undefined}
              draggable={Boolean(onMove)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", file.headline);
                setDragId(file.id);
                onSelect(file.id);
              }}
              onDragOver={(event) => dragOver(event, file.id)}
              onDrop={dropOn}
              onDragEnd={endDrag}
              onClick={() => onSelect(file.id)}
              onDoubleClick={() => onOpen(file.id)}
            >
              <td className={styles.num}>{file.rank ?? "—"}</td>
              <td className={styles.headlineCell}>
                <span className={styles.name}>
                  <button
                    type="button"
                    id={rowButtonId(file.id)}
                    className={styles.headline}
                    onKeyDown={(event) => keyDown(event, index)}
                  >
                    {file.headline}
                  </button>
                  {file.cover && <span className={styles.coverTag}>Cover</span>}
                </span>
              </td>
              <td className={styles.wide}>{file.author}</td>
              <td className={styles.wide}>{file.section}</td>
              <td className={styles.medium}>
                <time dateTime={file.createdAt}>{file.publishedOn}</time>
              </td>
              <td className={`${styles.num} ${styles.wide}`}>{file.words.toLocaleString("en-US")}</td>
              <td className={`${styles.num} ${styles.medium}`}>
                {file.editsUsed}
              </td>
              <td className={styles.num}>{file.page ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {files.length === 0 && <p className={styles.emptyFolder}>This folder is empty.</p>}
    </div>
  );
}

/** The element to focus to put the keyboard on a file's row. */
export function rowButtonId(id: number): string {
  return `desk-file-${id}`;
}

function toPlacement(edge: DropEdge, anchorId: number): Placement {
  return edge === "above" ? { above: anchorId } : { below: anchorId };
}

function ariaSort(sort: Sort, key: SortKey) {
  if (sort.key !== key) return undefined;
  return sort.descending ? "descending" : "ascending";
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DeskFile } from "@/desk/files";
import {
  FEED_ORDER,
  PAPER,
  filesIn,
  folderPath,
  folderTree,
  nextSort,
  sortFiles,
  type FolderId,
  type Placement,
  type Sort,
} from "@/desk/folders";
import { DeskToolbar } from "./DeskToolbar";
import { FileList, rowButtonId } from "./FileList";
import { FolderTree } from "./FolderTree";
import { useDeskFiles } from "./useDeskFiles";
import styles from "./Desk.module.css";

interface DeskProps {
  instanceName: string;
  files: DeskFile[];
}

/**
 * The editor's file manager: folders on the left, the open folder's writings
 * on the right, and a toolbar that acts on the selected one.
 */
export function Desk({ instanceName, files: serverFiles }: DeskProps) {
  const router = useRouter();
  const { files, error, busy, move, spike, cover } = useDeskFiles(serverFiles);
  const [folder, setFolder] = useState<FolderId>(PAPER);
  const [sort, setSort] = useState<Sort>(FEED_ORDER);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const listed = sortFiles(filesIn(files, folder), sort);
  const selected = listed.find((f) => f.id === selectedId) ?? null;
  const inFeedOrder = folder.kind !== "spiked" && sort.key === "order" && !sort.descending;
  const canMove = inFeedOrder && !busy;

  async function moveSelected(id: number, placement: Placement) {
    await move(id, placement);
    // Reordering rows can drop keyboard focus; put it back on the moved file.
    document.getElementById(rowButtonId(id))?.focus();
  }

  return (
    <section className={styles.desk} aria-label="Writings" aria-busy={busy}>
      <FolderTree
        tree={folderTree(files)}
        open={folder}
        onOpen={(next) => {
          setFolder(next);
          setSort(FEED_ORDER);
        }}
      />
      <div className={styles.pane}>
        <p className={styles.path}>{[instanceName, ...folderPath(folder)].join(" / ")}</p>
        <DeskToolbar
          listed={listed}
          selected={selected}
          onMove={canMove ? moveSelected : undefined}
          onSpike={busy ? undefined : spike}
          onCover={busy ? undefined : cover}
        />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <FileList
          files={listed}
          sort={sort}
          onSort={(key) => setSort(nextSort(sort, key))}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onOpen={(id) => router.push(listed.find((file) => file.id === id)?.href ?? `/w/${id}`)}
          onMove={canMove ? moveSelected : undefined}
        />
        <p className={styles.status}>{selected ? describeFile(selected) : describeFolder(listed, inFeedOrder)}</p>
      </div>
    </section>
  );
}

function describeFile(file: DeskFile): string {
  const where = file.spiked ? "spiked, hidden from readers" : `page ${file.page ?? "?"}${file.cover ? ", the cover story" : ""}`;
  return [
    `W${file.id}`,
    `by ${file.author}`,
    `published ${file.publishedOn}`,
    `${file.words.toLocaleString("en-US")} words`,
    `edited ${file.editsUsed} ${file.editsUsed === 1 ? "time" : "times"}`,
    where,
  ].join(" · ");
}

function describeFolder(files: DeskFile[], inFeedOrder: boolean): string {
  const words = files.reduce((sum, f) => sum + f.words, 0);
  const summary = `${plural(files.length, "writing")} · ${words.toLocaleString("en-US")} words`;
  return inFeedOrder && files.length > 1 ? `${summary} · drag a row, or select one and use the toolbar, to reorder` : summary;
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

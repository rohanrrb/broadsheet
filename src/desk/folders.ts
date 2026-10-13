import type { DeskFile } from "./files";

/**
 * The desk shows an instance's writings the way a file manager shows a disk:
 * folders on the left, the files of one folder on the right. Folders are
 * views derived from the writings, not something stored.
 */

export type FolderId =
  | { kind: "paper" }
  | { kind: "section"; name: string }
  | { kind: "writer"; name: string }
  | { kind: "spiked" };

export interface Folder {
  id: FolderId;
  name: string;
  count: number;
}

export interface FolderTree {
  paper: Folder;
  sections: Folder[];
  writers: Folder[];
  spiked: Folder;
}

export const PAPER: FolderId = { kind: "paper" };

export function folderTree(files: readonly DeskFile[]): FolderTree {
  const inPrint = files.filter((f) => !f.spiked);
  return {
    paper: { id: PAPER, name: "The paper", count: inPrint.length },
    sections: groupFolders(inPrint, (f) => f.section, (name) => ({ kind: "section", name })),
    writers: groupFolders(inPrint, (f) => f.author, (name) => ({ kind: "writer", name })),
    spiked: { id: { kind: "spiked" }, name: "Spiked", count: files.length - inPrint.length },
  };
}

/** The files a folder holds, in feed order. Everything but Spiked holds only writings in print. */
export function filesIn(files: readonly DeskFile[], folder: FolderId): DeskFile[] {
  if (folder.kind === "spiked") return files.filter((f) => f.spiked);
  const inPrint = files.filter((f) => !f.spiked);
  if (folder.kind === "section") return inPrint.filter((f) => f.section === folder.name);
  if (folder.kind === "writer") return inPrint.filter((f) => f.author === folder.name);
  return inPrint;
}

export function sameFolder(a: FolderId, b: FolderId): boolean {
  return a.kind === b.kind && ("name" in a ? a.name : "") === ("name" in b ? b.name : "");
}

/** The folder's path from the instance root, for the path bar. */
export function folderPath(folder: FolderId): string[] {
  if (folder.kind === "paper") return ["The paper"];
  if (folder.kind === "spiked") return ["Spiked"];
  return ["The paper", folder.kind === "section" ? "Sections" : "Writers", folder.name];
}

export type SortKey = "order" | "headline" | "author" | "section" | "date" | "words" | "edits";
export interface Sort {
  key: SortKey;
  descending: boolean;
}

/** Feed order, as readers get it: the only sort in which stories can be moved. */
export const FEED_ORDER: Sort = { key: "order", descending: false };

const COMPARE: Record<SortKey, (a: DeskFile, b: DeskFile) => number> = {
  // Files arrive in feed order, and the sort is stable.
  order: () => 0,
  headline: (a, b) => a.headline.localeCompare(b.headline),
  author: (a, b) => a.author.localeCompare(b.author),
  section: (a, b) => a.section.localeCompare(b.section),
  date: (a, b) => a.createdAt.localeCompare(b.createdAt),
  words: (a, b) => a.words - b.words,
  edits: (a, b) => a.editsUsed - b.editsUsed,
};

export function sortFiles(files: readonly DeskFile[], sort: Sort): DeskFile[] {
  const sorted = [...files].sort(COMPARE[sort.key]);
  return sort.descending ? sorted.reverse() : sorted;
}

/** Clicking a column head sorts by it; clicking it again reverses the sort. */
export function nextSort(current: Sort, key: SortKey): Sort {
  return { key, descending: current.key === key && !current.descending };
}

export type Placement = { above: number } | { below: number };

/**
 * The file list after a move, with feed ranks renumbered, so the desk can
 * show the new order before the server confirms it.
 */
export function moveFile(files: readonly DeskFile[], id: number, placement: Placement): DeskFile[] {
  const anchorId = "above" in placement ? placement.above : placement.below;
  const moving = files.find((f) => f.id === id);
  if (!moving || anchorId === id || !files.some((f) => f.id === anchorId)) return [...files];

  const rest = files.filter((f) => f.id !== id);
  const at = rest.findIndex((f) => f.id === anchorId) + ("above" in placement ? 0 : 1);
  return renumber([...rest.slice(0, at), moving, ...rest.slice(at)]);
}

function renumber(files: DeskFile[]): DeskFile[] {
  let rank = 0;
  return files.map((f) => (f.spiked ? f : { ...f, rank: ++rank }));
}

function groupFolders(
  files: readonly DeskFile[],
  nameOf: (file: DeskFile) => string,
  idOf: (name: string) => FolderId,
): Folder[] {
  const counts = new Map<string, number>();
  for (const file of files) counts.set(nameOf(file), (counts.get(nameOf(file)) ?? 0) + 1);
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ id: idOf(name), name, count }));
}

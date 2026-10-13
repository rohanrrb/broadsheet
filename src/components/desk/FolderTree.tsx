import { sameFolder, type Folder, type FolderId, type FolderTree as Tree } from "@/desk/folders";
import styles from "./Desk.module.css";

interface FolderTreeProps {
  tree: Tree;
  open: FolderId;
  onOpen: (folder: FolderId) => void;
}

/** The left pane: the instance as a tree of folders. */
export function FolderTree({ tree, open, onOpen }: FolderTreeProps) {
  const entry = (folder: Folder, nested = false) => (
    <li key={`${folder.id.kind}:${folder.name}`}>
      <button
        type="button"
        className={nested ? `${styles.folder} ${styles.nested}` : styles.folder}
        aria-current={sameFolder(folder.id, open) || undefined}
        onClick={() => onOpen(folder.id)}
      >
        <span className={styles.folderName}>{folder.name}</span>
        <span className={styles.count}>{folder.count}</span>
      </button>
    </li>
  );

  return (
    <nav className={styles.tree} aria-label="Folders">
      <ul className={styles.folders}>
        {entry(tree.paper)}
        <FolderGroup label="Sections">{tree.sections.map((f) => entry(f, true))}</FolderGroup>
        <FolderGroup label="Writers">{tree.writers.map((f) => entry(f, true))}</FolderGroup>
        {entry(tree.spiked)}
      </ul>
    </nav>
  );
}

function FolderGroup({ label, children }: { label: string; children: React.ReactNode[] }) {
  if (children.length === 0) return null;
  return (
    <li>
      <details className={styles.group} open>
        <summary>{label}</summary>
        <ul className={styles.folders}>{children}</ul>
      </details>
    </li>
  );
}

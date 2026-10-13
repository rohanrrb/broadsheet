"use client";

import { useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import type { Identity } from "@/editor/identity";
import { BLOCK_CONTROLS, isImageUrl } from "./controls";
import { Control } from "./Control";
import { ImageForm } from "./ImageForm";
import styles from "./controls.module.css";

interface EditorToolbarProps {
  editor: Editor;
  /** Who is writing, if the browser knows: a known writer can upload photos. */
  identity: Identity | null;
  onImport: () => void;
  onExport: () => void;
}

/** The quiet strip above the page: block styles, photos, and file import/export. */
export function EditorToolbar({ editor, identity, onImport, onExport }: EditorToolbarProps) {
  const [imageOpen, setImageOpen] = useState(false);
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => Object.fromEntries(BLOCK_CONTROLS.map((c) => [c.id, c.isActive(e)])),
  });

  const insertImage = (src: string, caption: string) => {
    if (!isImageUrl(src)) return "A photo needs a web address (https://…).";
    editor.chain().focus().setImage({ src: src.trim(), alt: caption.trim() || undefined }).run();
    setImageOpen(false);
    return null;
  };

  return (
    <div className={styles.toolbarWrap}>
      <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
        <div className={styles.group}>
          {BLOCK_CONTROLS.map((control) => (
            <Control key={control.id} hint={control.hint} active={active[control.id]} onPress={() => control.run(editor)}>
              {control.label}
            </Control>
          ))}
          <Control hint="Insert a photo" active={imageOpen} onPress={() => setImageOpen((open) => !open)}>
            Photo
          </Control>
        </div>
        <div className={styles.group}>
          <Control hint="Fill the editor from a .md, .txt, .docx or .html file (or drop one on the page)" onPress={onImport}>
            Import
          </Control>
          <Control hint="Download this piece as Markdown" onPress={onExport}>
            Export .md
          </Control>
        </div>
      </div>
      {imageOpen && <ImageForm identity={identity} onInsert={insertImage} onCancel={() => setImageOpen(false)} />}
    </div>
  );
}

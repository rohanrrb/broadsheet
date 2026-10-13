"use client";

import { useEffect, useRef } from "react";
import { useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import type { TiptapDoc } from "@/core/db";
import { documentExtensions, emptyDoc } from "@/editor/schema";
import prose from "@/components/Prose.module.css";
import { MarkdownInput } from "./markdownInput";
import styles from "./WritingEditor.module.css";

interface WritingEditorOptions {
  initialBody?: TiptapDoc;
  /** Mod-K: open the link field for the selection. */
  onLinkShortcut: () => void;
}

/** The Tiptap editor, configured with broadsheet's document model and quiet chrome. */
export function useWritingEditor({ initialBody, onLinkShortcut }: WritingEditorOptions): Editor | null {
  const linkShortcut = useRef(onLinkShortcut);
  useEffect(() => {
    linkShortcut.current = onLinkShortcut;
  }, [onLinkShortcut]);

  const editor = useEditor({
    extensions: [...documentExtensions(), MarkdownInput, Placeholder.configure({ placeholder: "Begin writing…" })],
    content: toContent(initialBody ?? emptyDoc()),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: `${prose.prose} ${styles.prose}`, "aria-label": "Article body" },
      handleKeyDown: (_view, event) => {
        if (!isLinkShortcut(event)) return false;
        event.preventDefault();
        linkShortcut.current();
        return true;
      },
    },
  });

  return editor;
}

function isLinkShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "k";
}

/** Stored bodies are Tiptap JSON; this only tells TypeScript so. */
export function toContent(doc: TiptapDoc): JSONContent {
  return doc as JSONContent;
}

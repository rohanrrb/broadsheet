"use client";

import { useCallback, type ChangeEvent } from "react";
import type { Editor } from "@tiptap/react";
import type { TiptapDoc } from "@/core/db";
import { docToMarkdown, markdownFileName } from "@/editor/export/markdown";
import { applyImport } from "@/editor/import/apply";
import { importFile, UnsupportedFileError } from "@/editor/import/registry";
import { isBlankDoc } from "@/editor/schema";
import { toContent } from "./useWritingEditor";

interface ImportExportOptions {
  editor: Editor | null;
  title: string;
  setTitle: (title: string) => void;
  onMessage: (tone: "error" | "note", text: string) => void;
}

/** Filling the editor from a file, and downloading it as Markdown. */
export function useImportExport({ editor, title, setTitle, onMessage }: ImportExportOptions) {
  const importSource = useCallback(
    async (file: File) => {
      if (!editor) return;
      try {
        const imported = await importFile(file);
        const hasWork = !isBlankDoc(editor.getJSON() as TiptapDoc);
        if (hasWork && !window.confirm(`Replace the text in the editor with “${file.name}”?`)) return;
        const next = applyImport(title, imported);
        setTitle(next.title);
        editor.commands.setContent(toContent(next.body), { emitUpdate: true });
        onMessage("note", `Imported ${file.name}`);
      } catch (error) {
        const text = error instanceof UnsupportedFileError ? error.message : `Couldn't read “${file.name}”.`;
        onMessage("error", text);
      }
    },
    [editor, title, setTitle, onMessage],
  );

  const onFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void importSource(file);
  };

  const exportMarkdown = () => {
    if (editor) download(docToMarkdown(editor.getJSON() as TiptapDoc, title), markdownFileName(title));
  };

  return { importSource, onFilePicked, exportMarkdown };
}

function download(text: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  link.click();
  URL.revokeObjectURL(url);
}

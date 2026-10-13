import type { TiptapDoc } from "@/core/db";
import { topLevelNodes } from "@/feed/tiptap";
import { heading, isEmptyParagraph, text } from "./nodes";
import type { ImportedWriting } from "./types";

/**
 * What the editor shows after an import. The file's title fills an empty
 * headline field; if the writer already typed a headline, the file's title is
 * kept at the top of the body as a subheading instead of being lost.
 */
export function applyImport(currentTitle: string, imported: ImportedWriting): { title: string; body: TiptapDoc } {
  if (!imported.title) return { title: currentTitle, body: imported.body };
  if (currentTitle.trim() === "") return { title: imported.title, body: imported.body };
  const content = topLevelNodes(imported.body).filter((n) => !isEmptyParagraph(n));
  return {
    title: currentTitle,
    body: { type: "doc", content: [heading(2, [text(imported.title)]), ...content] },
  };
}

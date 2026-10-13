import { marked } from "marked";
import { htmlToWriting } from "./html";
import type { ImportedWriting, Importer } from "./types";

/** Markdown (CommonMark + GFM) to a broadsheet document, by way of HTML. */
export function markdownToWriting(markdown: string): ImportedWriting {
  const html = marked.parse(stripFrontMatter(markdown), { async: false, gfm: true });
  return htmlToWriting(html);
}

export const markdownImporter: Importer = {
  label: "Markdown",
  extensions: [".md", ".markdown"],
  read: async (source) => markdownToWriting(await source.text()),
};

/** YAML front matter (`---` fenced, at the very top) is metadata, not prose. */
function stripFrontMatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

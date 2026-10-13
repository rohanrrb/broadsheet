import type { TiptapNode } from "@/feed/tiptap";
import { markdownToWriting } from "./markdown";
import { heading, text } from "./nodes";

/** Markdown a writer would notice had been left unread: a link, bold, a subhead, a quote, a list. */
const MARKDOWN = /\[[^\]\n]+\]\([^)\s]+\)|\*\*\S[^\n]*?\*\*|__\S[^\n]*?__|^#{1,6} \S|^> \S|^[-*+] \S|^\d+\. \S/m;

/**
 * Pasted plain text, read as Markdown: what to set in its place, or null when
 * it is only text. A single paragraph comes back as its words, to join the
 * line it is pasted into; anything longer comes back as whole blocks.
 */
export function pastedMarkdown(pasted: string): TiptapNode[] | null {
  if (!MARKDOWN.test(pasted)) return null;
  const { title, body } = markdownToWriting(pasted);
  const blocks = (body.content ?? []) as TiptapNode[];
  if (title) return [heading(2, [text(title)]), ...blocks];
  if (blocks.length === 1 && blocks[0].type === "paragraph") return blocks[0].content ?? null;
  return blocks;
}

/** Where a link typed as `[words](address)` leads; a bare domain is taken to be on the web. Null for anywhere a link may not go. */
export function linkAddress(typed: string): string | null {
  const address = typed.trim();
  if (/^(https?:\/\/|mailto:|\/(?!\/))/i.test(address)) return address;
  return /^[\w-]+(\.[\w-]+)+([/?#]\S*)?$/.test(address) ? `https://${address}` : null;
}

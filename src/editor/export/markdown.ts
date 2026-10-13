import type { TiptapDoc } from "@/core/db";
import { topLevelNodes, type TiptapNode } from "@/feed/tiptap";

/**
 * A broadsheet document as Markdown, for writers taking their work elsewhere.
 * The title, if given, becomes a leading `# ` heading, so the Markdown
 * importer reads the file back with the same title.
 */
export function docToMarkdown(doc: TiptapDoc, title?: string): string {
  const blocks = topLevelNodes(doc).map(blockToMarkdown).filter((b) => b.length > 0);
  const head = title?.trim() ? [`# ${escapeText(title.trim())}`] : [];
  return [...head, ...blocks].join("\n\n") + "\n";
}

function blockToMarkdown(node: TiptapNode): string {
  switch (node.type) {
    case "paragraph":
      return inlinesToMarkdown(node.content);
    case "heading":
      return `${node.attrs?.level === 3 ? "###" : "##"} ${inlinesToMarkdown(node.content)}`;
    case "blockquote":
      return prefixLines(childBlocks(node).join("\n\n"), "> ");
    case "bulletList":
      return listToMarkdown(node, () => "- ");
    case "orderedList":
      return listToMarkdown(node, (i) => `${i + 1}. `);
    case "horizontalRule":
      return "---";
    case "image":
      return imageToMarkdown(node);
    default:
      return inlinesToMarkdown(node.content);
  }
}

function childBlocks(node: TiptapNode): string[] {
  return (node.content ?? []).map(blockToMarkdown).filter((b) => b.length > 0);
}

/** Items are separated by single newlines; continuation lines are indented under the marker. */
function listToMarkdown(list: TiptapNode, marker: (i: number) => string): string {
  return (list.content ?? [])
    .map((item, i) => {
      const bullet = marker(i);
      const body = childBlocks(item).join("\n\n");
      return bullet + indentFollowingLines(body, " ".repeat(bullet.length));
    })
    .join("\n");
}

function imageToMarkdown(node: TiptapNode): string {
  const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
  const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
  return src ? `![${escapeText(alt)}](${src})` : "";
}

function inlinesToMarkdown(nodes: TiptapNode[] = []): string {
  return nodes.map(inlineToMarkdown).join("");
}

function inlineToMarkdown(node: TiptapNode): string {
  if (node.type === "hardBreak") return "\\\n";
  if (node.type !== "text") return "";
  return (node.marks ?? []).reduce(applyMark, escapeText(node.text ?? ""));
}

function applyMark(content: string, mark: NonNullable<TiptapNode["marks"]>[number]): string {
  switch (mark.type) {
    case "bold":
      return `**${content}**`;
    case "italic":
      return `*${content}*`;
    case "link":
      return typeof mark.attrs?.href === "string" ? `[${content}](${mark.attrs.href})` : content;
    default:
      return content;
  }
}

/** Escapes characters that would otherwise start Markdown syntax. */
function escapeText(value: string): string {
  return value
    .replace(/([\\`*_[\]<>])/g, "\\$1")
    .replace(/^(#{1,6} |[-+] )/, "\\$1")
    .replace(/^(\d+)\. /, "$1\\. ");
}

function prefixLines(value: string, prefix: string): string {
  return value
    .split("\n")
    .map((line) => (line ? prefix + line : prefix.trimEnd()))
    .join("\n");
}

function indentFollowingLines(value: string, indent: string): string {
  return value
    .split("\n")
    .map((line, i) => (i === 0 || !line ? line : indent + line))
    .join("\n");
}

/** "Bus Lanes, Reconsidered" → "bus-lanes-reconsidered.md" */
export function markdownFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${slug || "writing"}.md`;
}

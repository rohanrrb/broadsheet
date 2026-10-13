import type { TiptapDoc } from "@/core/db";

/** A loosely typed Tiptap/ProseMirror node, as stored in a writing body. */
export interface TiptapNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: TiptapNode[];
}

export function topLevelNodes(doc: TiptapDoc): TiptapNode[] {
  return (doc.content ?? []) as TiptapNode[];
}

/** Nodes whose children are inline text, so their text joins without spaces. */
const TEXTBLOCKS = new Set(["paragraph", "heading"]);

/**
 * A number for every paragraph and heading in a document, in reading order
 * and wherever it sits (in a list, in a quote). The feed and the piece's page
 * both count this way, so a place the one names is the place the other finds.
 */
export function textblockNumbers(doc: TiptapDoc): Map<TiptapNode, number> {
  const numbers = new Map<TiptapNode, number>();
  const visit = (node: TiptapNode) => {
    if (TEXTBLOCKS.has(node.type)) numbers.set(node, numbers.size);
    else node.content?.forEach(visit);
  };
  topLevelNodes(doc).forEach(visit);
  return numbers;
}

/** All text inside a node. Separate blocks (list items, quote paragraphs) are joined by a space. */
export function nodeText(node: TiptapNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  const separator = TEXTBLOCKS.has(node.type) ? "" : " ";
  return (node.content ?? []).map(nodeText).join(separator);
}

/** Every word in the document, headings, quotes and list items included. */
export function countWords(doc: TiptapDoc): number {
  const text = topLevelNodes(doc).map(nodeText).join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

/** The first image anywhere in the document, with its `src` and `alt`, if it has a `src`. */
export function firstImage(doc: TiptapDoc): { src: string; alt?: string } | undefined {
  const image = findNode(topLevelNodes(doc), (node) => node.type === "image" && typeof node.attrs?.src === "string");
  const src = image?.attrs?.src;
  if (typeof src !== "string" || src.length === 0) return undefined;
  const alt = image?.attrs?.alt;
  return { src, alt: typeof alt === "string" && alt.length > 0 ? alt : undefined };
}

function findNode(nodes: TiptapNode[], test: (node: TiptapNode) => boolean): TiptapNode | undefined {
  for (const node of nodes) {
    const found = test(node) ? node : findNode(node.content ?? [], test);
    if (found) return found;
  }
  return undefined;
}

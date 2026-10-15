import type { TiptapDoc } from "@/core/db";

/** A loosely typed Tiptap/ProseMirror node, enough to walk for its words. */
interface TiptapNode {
  text?: string;
  content?: TiptapNode[];
}

/** A writing's body reduced to its words, in reading order, for the detector to read as prose. */
export function plainTextOf(doc: TiptapDoc): string {
  return (doc.content as TiptapNode[] | undefined)?.map(nodeText).join(" ") ?? "";
}

function nodeText(node: TiptapNode): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(nodeText).join(" ");
}

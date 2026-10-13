import type { TiptapDoc } from "@/core/db";
import type { TiptapNode } from "@/feed/tiptap";
import type { ImportedWriting } from "./types";

/** Small builders shared by the importers, so every format emits the same shapes. */

export type Mark = NonNullable<TiptapNode["marks"]>[number];

/** Longest first line a plain-text file may have and still be read as its title. */
export const MAX_TITLE_LENGTH = 120;

export function text(value: string, marks: readonly Mark[] = []): TiptapNode {
  return marks.length > 0 ? { type: "text", text: value, marks: [...marks] } : { type: "text", text: value };
}

export function paragraph(inlines: readonly TiptapNode[]): TiptapNode {
  const content = tidyInlines(inlines);
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
}

export function heading(level: number, inlines: readonly TiptapNode[]): TiptapNode {
  return { type: "heading", attrs: { level }, content: tidyInlines(inlines) };
}

export function image(src: string, alt: string | null): TiptapNode {
  return { type: "image", attrs: { src, alt: alt && alt.trim() ? alt.trim() : null } };
}

export function doc(blocks: readonly TiptapNode[]): TiptapDoc {
  return { type: "doc", content: blocks.length > 0 ? [...blocks] : [paragraph([])] };
}

export function isEmptyParagraph(node: TiptapNode): boolean {
  return node.type === "paragraph" && (node.content ?? []).length === 0;
}

/** Plain text of inline nodes, hard breaks read as spaces. */
function inlineText(inlines: readonly TiptapNode[]): string {
  return inlines.map((n) => (n.type === "text" ? (n.text ?? "") : " ")).join("");
}

/**
 * Collapses HTML-style whitespace: trims the ends of the run and around hard
 * breaks, drops empty text, and merges neighbours with identical marks.
 */
function tidyInlines(inlines: readonly TiptapNode[]): TiptapNode[] {
  const out: TiptapNode[] = [];
  for (const node of inlines) {
    if (node.type !== "text") {
      trimEnd(out);
      out.push(node);
      continue;
    }
    const previous = out[out.length - 1];
    const atLineStart = !previous || previous.type !== "text";
    const value = collapse(node.text ?? "", atLineStart, previous);
    if (value.length === 0) continue;
    if (previous?.type === "text" && sameMarks(previous, node)) previous.text += value;
    else out.push(text(value, node.marks));
  }
  trimEnd(out);
  while (out[out.length - 1]?.type === "hardBreak") out.pop();
  return out;
}

function collapse(value: string, atLineStart: boolean, previous: TiptapNode | undefined): string {
  let result = value.replace(/\s+/g, " ");
  const previousEndsInSpace = previous?.type === "text" && previous.text?.endsWith(" ");
  if (atLineStart || previousEndsInSpace) result = result.replace(/^ /, "");
  return result;
}

function trimEnd(out: TiptapNode[]): void {
  const last = out[out.length - 1];
  if (last?.type !== "text") return;
  last.text = last.text!.replace(/ $/, "");
  if (last.text.length === 0) out.pop();
}

function sameMarks(a: TiptapNode, b: TiptapNode): boolean {
  return JSON.stringify(a.marks ?? []) === JSON.stringify(b.marks ?? []);
}

/**
 * Lifts a leading level-1 heading out as the title, then folds the remaining
 * heading levels onto the editor's two: 1-2 become H2, 3-6 become H3.
 */
export function withLeadingTitle(blocks: readonly TiptapNode[], fallbackTitle: string | null = null): ImportedWriting {
  const content = blocks.filter((b) => !isEmptyParagraph(b));
  const first = content[0];
  const hasTitle = first?.type === "heading" && first.attrs?.level === 1;
  const title = hasTitle ? inlineText(first.content ?? []).trim() : fallbackTitle?.trim() || null;
  const rest = hasTitle ? content.slice(1) : content;
  return { title: title || null, body: doc(rest.map(foldHeadingLevel)) };
}

function foldHeadingLevel(node: TiptapNode): TiptapNode {
  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 2);
    return { ...node, attrs: { level: level <= 2 ? 2 : 3 } };
  }
  return node.content ? { ...node, content: node.content.map(foldHeadingLevel) } : node;
}

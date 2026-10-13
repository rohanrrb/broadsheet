import type { TiptapNode } from "@/feed/tiptap";
import { doc, MAX_TITLE_LENGTH, paragraph, text } from "./nodes";
import type { ImportedWriting, Importer } from "./types";

/**
 * Plain text: paragraphs are separated by blank lines, and single line breaks
 * inside a paragraph are read as hard-wrapping, not meaning. A short first
 * line standing on its own is taken as the title.
 */
export function textToWriting(source: string): ImportedWriting {
  const paragraphs = splitParagraphs(source);
  const title = titleOf(paragraphs);
  const body = title ? paragraphs.slice(1) : paragraphs;
  return { title, body: doc(body.map(toParagraph)) };
}

export const textImporter: Importer = {
  label: "Plain text",
  extensions: [".txt", ".text"],
  read: async (source) => textToWriting(await source.text()),
};

function splitParagraphs(source: string): string[][] {
  return source
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
}

function titleOf(paragraphs: string[][]): string | null {
  const [first] = paragraphs;
  if (!first || first.length !== 1 || paragraphs.length < 2) return null;
  return first[0].length <= MAX_TITLE_LENGTH ? first[0] : null;
}

function toParagraph(lines: string[]): TiptapNode {
  return paragraph([text(lines.join(" "))]);
}

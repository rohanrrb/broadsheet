import type { Editor } from "@tiptap/react";
import { isOwnImagePath } from "@/core/images/limits";

/** One formatting command, shared by the toolbar and the selection menu. */
export interface FormatControl {
  id: string;
  label: string;
  /** Tooltip, including the keyboard shortcut. */
  hint: string;
  isActive(editor: Editor): boolean;
  run(editor: Editor): void;
}

export const BOLD: FormatControl = {
  id: "bold",
  label: "Bold",
  hint: "Bold (⌘/Ctrl B)",
  isActive: (e) => e.isActive("bold"),
  run: (e) => e.chain().focus().toggleBold().run(),
};

export const ITALIC: FormatControl = {
  id: "italic",
  label: "Italic",
  hint: "Italic (⌘/Ctrl I)",
  isActive: (e) => e.isActive("italic"),
  run: (e) => e.chain().focus().toggleItalic().run(),
};

export const HEADING: FormatControl = {
  id: "h2",
  label: "Heading",
  hint: "Section heading (⌘/Ctrl Alt 2, or type ## )",
  isActive: (e) => e.isActive("heading", { level: 2 }),
  run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
};

export const SUBHEAD: FormatControl = {
  id: "h3",
  label: "Subhead",
  hint: "Subheading (⌘/Ctrl Alt 3, or type ### )",
  isActive: (e) => e.isActive("heading", { level: 3 }),
  run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
};

export const QUOTE: FormatControl = {
  id: "quote",
  label: "Quote",
  hint: "Pull quote (⌘/Ctrl Shift B, or type > )",
  isActive: (e) => e.isActive("blockquote"),
  run: (e) => e.chain().focus().toggleBlockquote().run(),
};

export const LIST: FormatControl = {
  id: "list",
  label: "List",
  hint: "Bulleted list (⌘/Ctrl Shift 8, or type - )",
  isActive: (e) => e.isActive("bulletList"),
  run: (e) => e.chain().focus().toggleBulletList().run(),
};

export const BLOCK_CONTROLS = [HEADING, SUBHEAD, QUOTE, LIST] as const;

/** Only web and mail links; a bare domain gets https. */
export function normalizeHref(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^(https?:\/\/|mailto:)/i.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  if (/^[^\s:/]+\.[^\s]+$/.test(value)) return `https://${value}`;
  return null;
}

/** A photo's address: on the web, or one uploaded to the paper. */
export function isImageUrl(input: string): boolean {
  const value = input.trim();
  return /^https?:\/\/\S+$/i.test(value) || isOwnImagePath(value);
}

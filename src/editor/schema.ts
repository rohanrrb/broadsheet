import { getSchema, mergeAttributes, type AnyExtension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import type { TiptapDoc } from "@/core/db";
import { isOwnImagePath } from "@/core/images/limits";

/**
 * The document model broadsheet writings use. Deliberately small: paragraphs,
 * H2/H3, blockquotes, lists, rules, block images, and bold/italic/link.
 * The editor, the importers and the server all agree on this one list, so
 * whatever the editor can produce, the server accepts and the reader renders.
 */
const HEADING_LEVELS = [2, 3] as const;

export function documentExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      heading: { levels: [...HEADING_LEVELS] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      },
    }),
    CaptionedImage.configure({ inline: false, allowBase64: false }),
  ];
}

/**
 * A block photo whose alt text is also its printed caption. The editor shows
 * the caption under the photo, as the reader page does.
 */
const CaptionedImage = Image.extend({
  renderHTML({ node, HTMLAttributes }) {
    const img = ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)] as const;
    const caption = typeof node.attrs.alt === "string" ? node.attrs.alt.trim() : "";
    return caption ? ["figure", {}, img, ["figcaption", {}, caption]] : ["figure", {}, img];
  },
});

let cachedSchema: Schema | null = null;

function documentSchema(): Schema {
  cachedSchema ??= getSchema(documentExtensions());
  return cachedSchema;
}

export class InvalidDocumentError extends Error {
  constructor(reason: string) {
    super(`Invalid document: ${reason}`);
    this.name = "InvalidDocumentError";
  }
}

/**
 * Parses untrusted JSON against the schema and returns it normalized
 * (default attributes filled in, marks in canonical order).
 * Throws InvalidDocumentError for unknown nodes, marks, or bad nesting, for
 * nesting past MAX_DOC_DEPTH, and for a photo from anywhere but the web or
 * the paper's own uploads. A link that leads anywhere it may not is dropped
 * without complaint.
 */
export function normalizeDoc(json: unknown): TiptapDoc {
  const node = parseDoc(json);
  return trimTrailingEmptyParagraphs(node.toJSON() as TiptapDoc);
}

/**
 * Editors keep an empty paragraph at the end for the caret to land in. It is
 * not part of the writing, so it never counts as a change or gets stored.
 */
export function trimTrailingEmptyParagraphs(doc: TiptapDoc): TiptapDoc {
  const content = [...(doc.content ?? [])];
  while (content.length > 1 && isEmptyParagraph(content[content.length - 1])) content.pop();
  return { ...doc, content };
}

function isEmptyParagraph(node: unknown): boolean {
  if (!isRecord(node) || node.type !== "paragraph") return false;
  return !Array.isArray(node.content) || node.content.length === 0;
}

/** True when the document has no words and no images. */
export function isBlankDoc(doc: TiptapDoc): boolean {
  const node = parseDoc(doc);
  let blank = node.textContent.trim().length === 0;
  node.descendants((child) => {
    if (child.type.name === "image") blank = false;
    return blank;
  });
  return blank;
}

export function emptyDoc(): TiptapDoc {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/**
 * How deep a document's nodes may nest. A list in a quote in a list is about
 * eight; nothing a writer does by hand comes near this. A document nested by
 * the thousand would otherwise be stored, and then break every page that
 * walks it to set the feed.
 */
export const MAX_DOC_DEPTH = 16;
/** Where a photo may come from (the web, or the paper's own uploads), and where a link may lead: the web, mail, or a page of the paper itself. */
const WEB_IMAGE = /^https?:\/\//i;
const isImageSrc = (src: string) => WEB_IMAGE.test(src) || isOwnImagePath(src);
const LINK_HREF = /^(https?:\/\/|mailto:|\/(?!\/))/i;

function parseDoc(json: unknown): PMNode {
  if (!isRecord(json) || json.type !== "doc") throw new InvalidDocumentError("not a doc");
  if (depthExceeds(json, MAX_DOC_DEPTH)) throw new InvalidDocumentError("nested too deeply");
  try {
    const node = documentSchema().nodeFromJSON(withSafeAddresses(json));
    node.check();
    return node;
  } catch (error) {
    throw new InvalidDocumentError(error instanceof Error ? error.message : String(error));
  }
}

/** Whether `json` nests deeper than `max`, found without recursion so no depth of input can exhaust the stack. */
function depthExceeds(json: unknown, max: number): boolean {
  let level: unknown[] = [json];
  for (let depth = 1; level.length > 0; depth++) {
    if (depth > max) return true;
    level = level.flatMap((node) => (isRecord(node) && Array.isArray(node.content) ? node.content : []));
  }
  return false;
}

/**
 * The document with nothing in it that leads where it should not. A link may
 * go to the web, to mail or to a page of the paper; to anything else it loses
 * its link and keeps its words. A link keeps no attribute its sender chose,
 * only its address. A photo from anywhere but the web or the paper's own
 * uploads is refused. This keeps such addresses out of the paper's file, and
 * so out of exports and of any page written later, whatever the reader's own
 * check lets through.
 */
function withSafeAddresses(node: Record<string, unknown>): Record<string, unknown> {
  if (node.type === "image") {
    const src = isRecord(node.attrs) ? node.attrs.src : undefined;
    if (typeof src !== "string" || !isImageSrc(src)) throw new InvalidDocumentError("a photo needs a web address");
  }
  const marks = Array.isArray(node.marks) ? { marks: node.marks.flatMap(safeMark) } : {};
  const content = Array.isArray(node.content)
    ? { content: node.content.map((child) => (isRecord(child) ? withSafeAddresses(child) : child)) }
    : {};
  return { ...node, ...marks, ...content };
}

function safeMark(mark: unknown): unknown[] {
  if (!isRecord(mark) || mark.type !== "link") return [mark];
  const href = isRecord(mark.attrs) ? mark.attrs.href : undefined;
  return typeof href === "string" && LINK_HREF.test(href.trim()) ? [{ type: "link", attrs: { href: href.trim() } }] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

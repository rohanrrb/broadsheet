import { DomUtils, parseDocument } from "htmlparser2";
import { isTag, isText, type ChildNode, type Element } from "domhandler";
import type { TiptapNode } from "@/feed/tiptap";
import { heading, image, paragraph, text, withLeadingTitle, type Mark } from "./nodes";
import type { ImportedWriting, Importer } from "./types";

/**
 * HTML to a broadsheet document. Also the back end of the Markdown and .docx
 * importers, which render to HTML first. Anything outside the editor's small
 * vocabulary keeps its text and loses its styling.
 */
export function htmlToWriting(html: string): ImportedWriting {
  const dom = parseDocument(html);
  return withLeadingTitle(blocksFrom(dom.children), documentTitle(dom.children));
}

export const htmlImporter: Importer = {
  label: "HTML",
  extensions: [".html", ".htm"],
  read: async (source) => htmlToWriting(await source.text()),
};

const IGNORED = new Set([
  "head", "script", "style", "template", "noscript", "iframe", "object", "svg",
  "nav", "form", "button", "input", "select", "textarea",
]);

/** Elements that start a new block; everything else is read as inline. */
const BLOCKS = new Set([
  "address", "article", "aside", "blockquote", "body", "dd", "details", "div", "dl", "dt",
  "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "html",
  "img", "li", "main", "ol", "p", "pre", "section", "summary", "table", "tbody", "td", "tfoot",
  "th", "thead", "tr", "ul",
]);

const HEADING_TAG = /^h([1-6])$/;
const WEB_URL = /^https?:\/\//i;
/** Web and mail links, and links within the paper itself ("/about"). */
const LINK_URL = /^(https?:\/\/|mailto:|\/(?!\/))/i;

/** Block nodes for a run of siblings; loose inline content is gathered into paragraphs. */
function blocksFrom(nodes: readonly ChildNode[]): TiptapNode[] {
  const blocks: TiptapNode[] = [];
  let run: TiptapNode[] = [];
  const flush = () => {
    const p = paragraph(run);
    if (p.content) blocks.push(p);
    run = [];
  };
  for (const node of nodes) {
    if (isText(node) || (isTag(node) && isInlineElement(node))) {
      run.push(...inlinesFrom(node, []));
    } else if (isTag(node)) {
      flush();
      blocks.push(...blockFrom(node));
    }
  }
  flush();
  return blocks;
}

function isInlineElement(el: Element): boolean {
  if (BLOCKS.has(el.name) || IGNORED.has(el.name)) return false;
  // A link wrapping a photo is read as the photo.
  return DomUtils.findOne((e) => e.name === "img", el.children) === null;
}

function blockFrom(el: Element): TiptapNode[] {
  if (IGNORED.has(el.name)) return [];
  const level = HEADING_TAG.exec(el.name);
  if (level) return headingFrom(Number(level[1]), el);
  switch (el.name) {
    case "blockquote":
      return wrap("blockquote", blocksFrom(el.children));
    case "ul":
    case "ol":
      return listFrom(el);
    case "pre":
      return [paragraph(preformattedInlines(DomUtils.textContent(el)))];
    case "hr":
      return [{ type: "horizontalRule" }];
    case "img":
      return imageFrom(el, null);
    case "figure":
      return figureFrom(el);
    default:
      return blocksFrom(el.children);
  }
}

function headingFrom(level: number, el: Element): TiptapNode[] {
  const inlines = el.children.flatMap((child) => inlinesFrom(child, []));
  const node = heading(level, inlines);
  return node.content && node.content.length > 0 ? [node] : [];
}

function wrap(type: string, content: TiptapNode[]): TiptapNode[] {
  return content.length > 0 ? [{ type, content }] : [];
}

function listFrom(el: Element): TiptapNode[] {
  const items = el.children.filter(isTag).filter((c) => c.name === "li").map(listItemFrom);
  return wrap(el.name === "ol" ? "orderedList" : "bulletList", items);
}

/** A list item must open with a paragraph. */
function listItemFrom(li: Element): TiptapNode {
  const blocks = blocksFrom(li.children);
  const content = blocks[0]?.type === "paragraph" ? blocks : [paragraph([]), ...blocks];
  return { type: "listItem", content };
}

/** Photos from the web only: local paths and embedded data can't travel with the writing. */
function imageFrom(el: Element, caption: string | null): TiptapNode[] {
  const src = el.attribs.src?.trim() ?? "";
  if (!WEB_URL.test(src)) return [];
  return [image(src, caption || el.attribs.alt || null)];
}

/** A figure's caption is kept as the photo's alt text, which broadsheet prints as its caption. */
function figureFrom(el: Element): TiptapNode[] {
  const img = DomUtils.findOne((e) => e.name === "img", el.children);
  if (!img) return blocksFrom(el.children);
  const figcaption = DomUtils.findOne((e) => e.name === "figcaption", el.children);
  const caption = figcaption ? DomUtils.textContent(figcaption).replace(/\s+/g, " ").trim() : null;
  return imageFrom(img, caption);
}

function inlinesFrom(node: ChildNode, marks: readonly Mark[]): TiptapNode[] {
  if (isText(node)) return [text(node.data, marks)];
  if (!isTag(node) || IGNORED.has(node.name)) return [];
  if (node.name === "br") return [{ type: "hardBreak" }];
  const mark = markFor(node);
  const inner = mark && !marks.some((m) => m.type === mark.type) ? [...marks, mark] : marks;
  return node.children.flatMap((child) => inlinesFrom(child, inner));
}

function markFor(el: Element): Mark | null {
  switch (el.name) {
    case "strong":
    case "b":
      return { type: "bold" };
    case "em":
    case "i":
      return { type: "italic" };
    case "a": {
      const href = el.attribs.href?.trim() ?? "";
      return LINK_URL.test(href) ? { type: "link", attrs: { href } } : null;
    }
    default:
      return null;
  }
}

/** Preformatted text keeps its line breaks. */
function preformattedInlines(value: string): TiptapNode[] {
  return value
    .replace(/\n$/, "")
    .split("\n")
    .flatMap((line, i) => (i === 0 ? [text(line)] : [{ type: "hardBreak" }, text(line)]));
}

function documentTitle(nodes: ChildNode[]): string | null {
  const title = DomUtils.findOne((e) => e.name === "title", nodes);
  return title ? DomUtils.textContent(title).replace(/\s+/g, " ").trim() || null : null;
}

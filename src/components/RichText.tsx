import type { ReactNode } from "react";
import type { TiptapDoc } from "@/core/db";
import { textblockNumbers, topLevelNodes, type TiptapNode } from "@/feed/tiptap";
import { ArticleImage } from "./ArticleImage";

interface RichTextProps {
  doc: TiptapDoc;
  /** Photo captions that merely repeat the headline are not printed. */
  headline?: string;
  className?: string;
}

/** What every node is rendered with: the headline, and each paragraph's and heading's number in the piece. */
interface Setting {
  headline?: string;
  numbers: Map<TiptapNode, number>;
}

/**
 * Renders a stored Tiptap document as plain semantic HTML. Unknown nodes are
 * skipped. Each paragraph and heading carries its number in the piece as
 * `data-block`, by which a place in the text can be found again.
 */
export function RichText({ doc, headline, className }: RichTextProps) {
  return <div className={className}>{renderNodes(topLevelNodes(doc), { headline, numbers: textblockNumbers(doc) })}</div>;
}

function renderNodes(nodes: TiptapNode[] = [], setting: Setting): ReactNode[] {
  return nodes.map((node, i) => renderNode(node, i, setting));
}

function renderNode(node: TiptapNode, key: number, setting: Setting): ReactNode {
  const children = renderNodes(node.content, setting);
  const block = setting.numbers.get(node);
  switch (node.type) {
    case "paragraph":
      return <p key={key} data-block={block}>{children}</p>;
    case "heading":
      return node.attrs?.level === 3 ? <h3 key={key} data-block={block}>{children}</h3> : <h2 key={key} data-block={block}>{children}</h2>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "image":
      return <Photo key={key} node={node} headline={setting.headline} />;
    case "text":
      return <MarkedText key={key} node={node} />;
    default:
      return null;
  }
}

/** A photo; its alt text doubles as the printed caption, as the editor stores it. */
function Photo({ node, headline }: { node: TiptapNode; headline?: string }) {
  const { src, alt } = node.attrs ?? {};
  if (typeof src !== "string" || src.length === 0) return null;
  const text = typeof alt === "string" ? alt.trim() : "";
  const caption = text === headline?.trim() ? "" : text;
  return (
    <figure>
      <ArticleImage src={src} alt={caption} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function MarkedText({ node }: { node: TiptapNode }) {
  return (node.marks ?? []).reduce<ReactNode>(applyMark, node.text ?? "");
}

function applyMark(content: ReactNode, mark: NonNullable<TiptapNode["marks"]>[number]): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong>{content}</strong>;
    case "italic":
      return <em>{content}</em>;
    case "code":
      return <code>{content}</code>;
    case "link":
      return isSafeHref(mark.attrs?.href) ? (
        // A link to one of the paper's own pages stays in the tab; any other opens a new one.
        <a href={mark.attrs.href} target={mark.attrs.href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer nofollow">
          {content}
        </a>
      ) : (
        content
      );
    default:
      return content;
  }
}

/** Only ordinary web and mail links; never `javascript:` or other schemes. */
function isSafeHref(href: unknown): href is string {
  return typeof href === "string" && /^(https?:|mailto:|\/|#)/i.test(href);
}

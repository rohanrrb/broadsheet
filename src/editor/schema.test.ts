import { describe, expect, it } from "vitest";
import { InvalidDocumentError, MAX_DOC_DEPTH, isBlankDoc, normalizeDoc, trimTrailingEmptyParagraphs } from "./schema";

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("normalizeDoc", () => {
  it("accepts the editor's vocabulary and fills default attributes", () => {
    const doc = normalizeDoc({
      type: "doc",
      content: [p("x"), { type: "image", attrs: { src: "https://i.test/a.jpg", alt: "Cap" } }],
    });
    expect(doc.content![1]).toMatchObject({ type: "image", attrs: { src: "https://i.test/a.jpg", alt: "Cap", title: null } });
  });

  it.each([
    ["not a doc", { type: "paragraph" }],
    ["unknown nodes", { type: "doc", content: [{ type: "codeBlock" }] }],
    ["unknown marks", { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "strike" }] }] }] }],
    ["bad nesting", { type: "doc", content: [{ type: "text", text: "loose" }] }],
    ["garbage", "hello"],
  ])("rejects %s", (_, input) => {
    expect(() => normalizeDoc(input)).toThrow(InvalidDocumentError);
  });
});

describe("how deep a document may nest", () => {
  const quotes = (depth: number): unknown =>
    Array.from({ length: depth }).reduce<unknown>((inner) => ({ type: "blockquote", content: [inner] }), p("deep"));

  it("allows what a writer does by hand", () => {
    expect(() => normalizeDoc({ type: "doc", content: [quotes(6)] })).not.toThrow();
  });

  it.each([20, 2_000, 50_000])("refuses %i quotes inside one another, however many", (depth) => {
    expect(() => normalizeDoc({ type: "doc", content: [quotes(depth)] })).toThrow(InvalidDocumentError);
  });

  it("draws the line at MAX_DOC_DEPTH levels, counting the document, the paragraph and its text", () => {
    const deepest = MAX_DOC_DEPTH - 3;
    expect(() => normalizeDoc({ type: "doc", content: [quotes(deepest)] })).not.toThrow();
    expect(() => normalizeDoc({ type: "doc", content: [quotes(deepest + 1)] })).toThrow(InvalidDocumentError);
  });
});

describe("addresses in a document", () => {
  const linked = (attrs: Record<string, unknown>) => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "here", marks: [{ type: "link", attrs }] }] }],
  });
  const marksOf = (doc: ReturnType<typeof normalizeDoc>) =>
    (doc.content![0] as { content: { marks?: { attrs: Record<string, unknown> }[] }[] }).content[0].marks;

  it.each(["https://example.com/a", "mailto:a@example.com", "/about"])("keeps a link to %s", (href) => {
    expect(marksOf(normalizeDoc(linked({ href })))![0].attrs.href).toBe(href);
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "//evil.example", " JaVaScRiPt:alert(1)"])(
    "drops a link to %s and keeps its words",
    (href) => {
      const doc = normalizeDoc(linked({ href }));
      expect(marksOf(doc)).toBeUndefined();
      expect(JSON.stringify(doc)).toContain("here");
    },
  );

  it("keeps no attribute of a link that its sender chose", () => {
    const attrs = marksOf(normalizeDoc(linked({ href: "https://example.com", target: "_top", class: "x", rel: "opener" })))![0].attrs;
    expect(attrs).not.toMatchObject({ target: "_top" });
    expect(attrs).not.toMatchObject({ class: "x" });
    expect(attrs).not.toMatchObject({ rel: "opener" });
  });

  it.each(["javascript:alert(1)", "data:image/svg+xml,<svg/>", "/local.png"])("refuses a photo from %s", (src) => {
    expect(() => normalizeDoc({ type: "doc", content: [{ type: "image", attrs: { src } }] })).toThrow(InvalidDocumentError);
  });
});

describe("isBlankDoc", () => {
  it("is blank with only whitespace, not with words or a photo", () => {
    expect(isBlankDoc({ type: "doc", content: [{ type: "paragraph" }, p("  ")] })).toBe(true);
    expect(isBlankDoc({ type: "doc", content: [p("x")] })).toBe(false);
    expect(isBlankDoc({ type: "doc", content: [{ type: "image", attrs: { src: "https://i.test/a.jpg" } }] })).toBe(false);
  });
});

describe("trimTrailingEmptyParagraphs", () => {
  it("drops the caret's empty paragraphs at the end but keeps one block", () => {
    const empty = { type: "paragraph" };
    expect(trimTrailingEmptyParagraphs({ type: "doc", content: [p("x"), empty, empty] }).content).toEqual([p("x")]);
    expect(trimTrailingEmptyParagraphs({ type: "doc", content: [empty, empty] }).content).toEqual([empty]);
    expect(normalizeDoc({ type: "doc", content: [p("x"), empty] }).content).toHaveLength(1);
  });
});

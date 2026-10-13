import { describe, expect, it } from "vitest";
import type { TiptapDoc } from "@/core/db";
import { countWords, firstImage } from "./tiptap";

const t = (text: string, marks?: { type: string; attrs?: Record<string, unknown> }[]) =>
  marks ? { type: "text", text, marks } : { type: "text", text };
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const li = (text: string) => ({ type: "listItem", content: [p(t(text))] });

/** One of everything the editor can produce. */
const DOC: TiptapDoc = {
  type: "doc",
  content: [
    p(t("Opening "), t("bold", [{ type: "bold" }]), t(" and "), t("linked", [{ type: "link", attrs: { href: "https://x.org" } }]), t(".")),
    { type: "heading", attrs: { level: 2 }, content: [t("A Section")] },
    { type: "bulletList", content: [li("first item"), { type: "listItem", content: [p(t("second")), { type: "bulletList", content: [li("nested")] }] }] },
    { type: "orderedList", content: [li("numbered")] },
    { type: "blockquote", content: [p(t("Pull quote here"))] },
    { type: "horizontalRule" },
    p(t("Line"), { type: "hardBreak" }, t("break")),
    { type: "image", attrs: { src: "https://img.test/a.jpg", alt: "Harbor at dawn" } },
    { type: "heading", attrs: { level: 3 }, content: [t("Coda")] },
  ],
};

describe("countWords", () => {
  it("counts every block's words without gluing neighbours together", () => {
    // 4 + 2 + 2 + 1 + 1 + 1 + 3 + 2 + 1
    expect(countWords(DOC)).toBe(17);
  });
});

describe("firstImage", () => {
  it("finds the first image, nested or not", () => {
    expect(firstImage(DOC)).toEqual({ src: "https://img.test/a.jpg", alt: "Harbor at dawn" });
    const nested: TiptapDoc = { type: "doc", content: [{ type: "blockquote", content: [{ type: "image", attrs: { src: "https://i.test/b.png" } }] }] };
    expect(firstImage(nested)).toEqual({ src: "https://i.test/b.png", alt: undefined });
    expect(firstImage({ type: "doc", content: [p(t("none"))] })).toBeUndefined();
  });
});

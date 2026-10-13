import { describe, expect, it } from "vitest";
import { normalizeDoc } from "../schema";
import { markdownToWriting } from "./markdown";

describe("markdownToWriting", () => {
  const sample = [
    "---",
    "layout: post",
    "---",
    "# Bus Lanes, Reconsidered",
    "",
    "The **number 9** is *late* again. See [the data](https://example.com).",
    "",
    "## The numbers",
    "",
    "- faster",
    "- fairer",
    "",
    "> Buses are democracy on wheels.",
    "",
    "![A bus at dusk](https://img.test/bus.jpg)",
  ].join("\n");

  it("reads the H1 as the title and skips front matter", () => {
    const { title, body } = markdownToWriting(sample);
    expect(title).toBe("Bus Lanes, Reconsidered");
    expect(body.content!.map((n) => (n as { type: string }).type)).toEqual([
      "paragraph", "heading", "bulletList", "blockquote", "image",
    ]);
    expect(() => normalizeDoc(body)).not.toThrow();
  });

  it("keeps marks and links", () => {
    const [first] = markdownToWriting(sample).body.content as { content: unknown[] }[];
    expect(first.content).toEqual([
      { type: "text", text: "The " },
      { type: "text", text: "number 9", marks: [{ type: "bold" }] },
      { type: "text", text: " is " },
      { type: "text", text: "late", marks: [{ type: "italic" }] },
      { type: "text", text: " again. See " },
      { type: "text", text: "the data", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
      { type: "text", text: "." },
    ]);
  });

  it("stores an image's alt text as its caption", () => {
    const image = markdownToWriting(sample).body.content!.at(-1);
    expect(image).toEqual({ type: "image", attrs: { src: "https://img.test/bus.jpg", alt: "A bus at dusk" } });
  });

  it("has no title without a leading H1", () => {
    expect(markdownToWriting("Just a paragraph.\n\n# Late heading").title).toBeNull();
  });
});

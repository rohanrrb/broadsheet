import { describe, expect, it } from "vitest";
import { linkAddress, pastedMarkdown } from "./pasted";

describe("pastedMarkdown", () => {
  it("leaves plain text alone", () => {
    expect(pastedMarkdown("Nothing here but words, and a 2 * 3 sum.")).toBeNull();
    expect(pastedMarkdown("https://example.com")).toBeNull();
  });

  it("reads one line as words to join the line it lands in", () => {
    expect(pastedMarkdown("See [the data](https://example.com) and **weep**.")).toEqual([
      { type: "text", text: "See " },
      { type: "text", text: "the data", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
      { type: "text", text: " and " },
      { type: "text", text: "weep", marks: [{ type: "bold" }] },
      { type: "text", text: "." },
    ]);
  });

  it("reads several blocks as blocks, a leading title as a subhead", () => {
    const types = (pasted: string) => pastedMarkdown(pasted)!.map((n) => n.type);
    expect(types("## Numbers\n\n- faster\n- fairer\n\n> A quote.")).toEqual(["heading", "bulletList", "blockquote"]);
    expect(types("# Title\n\nWords.")).toEqual(["heading", "paragraph"]);
  });
});

describe("linkAddress", () => {
  it("keeps the web, mail and the paper's own pages", () => {
    expect(linkAddress(" https://example.com/a ")).toBe("https://example.com/a");
    expect(linkAddress("mailto:a@example.com")).toBe("mailto:a@example.com");
    expect(linkAddress("/about")).toBe("/about");
  });

  it("puts a bare domain on the web", () => {
    expect(linkAddress("example.com/a?b=1")).toBe("https://example.com/a?b=1");
  });

  it("refuses anywhere else", () => {
    expect(linkAddress("javascript:alert(1)")).toBeNull();
    expect(linkAddress("//evil.test")).toBeNull();
    expect(linkAddress("word")).toBeNull();
  });
});

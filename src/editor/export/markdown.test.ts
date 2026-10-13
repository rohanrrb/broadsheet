import { describe, expect, it } from "vitest";
import { markdownToWriting } from "../import/markdown";
import { docToMarkdown, markdownFileName } from "./markdown";

const SAMPLE = [
  "# Bus Lanes",
  "",
  "The **number 9** is *late*. See [data](https://example.com).",
  "",
  "## The numbers",
  "",
  "- faster",
  "- fairer",
  "",
  "1. first",
  "2. second",
  "",
  "> Buses are democracy on wheels.",
  "",
  "![A bus at dusk](https://img.test/bus.jpg)",
  "",
  "---",
  "",
  "### Coda",
  "",
  "Line one\\",
  "line two",
  "",
].join("\n");

describe("docToMarkdown", () => {
  it("writes every node the editor produces", () => {
    const { title, body } = markdownToWriting(SAMPLE);
    expect(docToMarkdown(body, title ?? undefined)).toBe(SAMPLE);
  });

  it("round-trips through the Markdown importer", () => {
    const first = markdownToWriting(SAMPLE);
    const again = markdownToWriting(docToMarkdown(first.body, first.title ?? undefined));
    expect(again).toEqual(first);
  });

  it("escapes text that would read as Markdown syntax", () => {
    const doc = {
      type: "doc" as const,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "# not a heading *or* [link]" }] },
        { type: "paragraph", content: [{ type: "text", text: "1. not a list" }] },
      ],
    };
    const markdown = docToMarkdown(doc);
    expect(markdown).toBe("\\# not a heading \\*or\\* \\[link\\]\n\n1\\. not a list\n");
    expect(markdownToWriting(markdown).body).toEqual(doc);
  });

  it("nests list continuation lines under their bullet", () => {
    const doc = markdownToWriting("- one\n\n  more\n- two\n").body;
    expect(docToMarkdown(doc)).toBe("- one\n\n  more\n- two\n");
  });
});

describe("markdownFileName", () => {
  it("slugs the headline", () => {
    expect(markdownFileName("Bus Lanes, Reconsidered")).toBe("bus-lanes-reconsidered.md");
    expect(markdownFileName("Café Society!")).toBe("cafe-society.md");
    expect(markdownFileName("  ")).toBe("writing.md");
  });
});

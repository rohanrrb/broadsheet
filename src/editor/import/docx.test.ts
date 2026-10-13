import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeDoc } from "../schema";
import { docxToWriting } from "./docx";

function fixture(name: string): ArrayBuffer {
  const bytes = readFileSync(path.join(import.meta.dirname, "fixtures", name));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe("docxToWriting", () => {
  it("reads the Title style as the title and Word headings, lists and links as structure", async () => {
    const { title, body } = await docxToWriting(fixture("sample.docx"));
    expect(title).toBe("The Quiet Case for Bus Lanes");
    expect(body.content).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Every morning the " },
          { type: "text", text: "number 9", marks: [{ type: "bold" }] },
          { type: "text", text: " crawls past a line of " },
          { type: "text", text: "parked", marks: [{ type: "italic" }] },
          { type: "text", text: " cars." },
        ],
      },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What the numbers say" }] },
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Faster trips" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Fewer delays" }] }] },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "More at " },
          { type: "text", text: "the city report", marks: [{ type: "link", attrs: { href: "https://example.com/report" } }] },
          { type: "text", text: "." },
        ],
      },
    ]);
    expect(() => normalizeDoc(body)).not.toThrow();
  });
});

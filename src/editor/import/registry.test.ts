import { describe, expect, it } from "vitest";
import { applyImport } from "./apply";
import { acceptAttribute, describeFormats, findImporter, importFile, UnsupportedFileError } from "./registry";
import type { Importer } from "./types";

const file = (name: string, contents: string) => ({
  name,
  text: async () => contents,
  arrayBuffer: async () => new TextEncoder().encode(contents).buffer as ArrayBuffer,
});

describe("import registry", () => {
  it("picks an importer by extension, case-insensitively", () => {
    expect(findImporter("Essay.MD")?.label).toBe("Markdown");
    expect(findImporter("notes.txt")?.label).toBe("Plain text");
    expect(findImporter("draft.docx")?.label).toBe("Word");
    expect(findImporter("page.htm")?.label).toBe("HTML");
    expect(findImporter("photo.png")).toBeNull();
  });

  it("imports through the matching importer and rejects unknown formats", async () => {
    expect((await importFile(file("a.md", "# Hi\n\nThere"))).title).toBe("Hi");
    await expect(importFile(file("a.pdf", ""))).rejects.toThrow(UnsupportedFileError);
  });

  it("lets new formats slot in", async () => {
    const shout: Importer = {
      label: "Shout",
      extensions: [".shout"],
      read: async (s) => ({ title: (await s.text()).toUpperCase(), body: { type: "doc", content: [] } }),
    };
    expect((await importFile(file("x.shout", "hey"), [shout])).title).toBe("HEY");
    expect(acceptAttribute([shout])).toBe(".shout");
  });

  it("describes the formats for writers", () => {
    expect(describeFormats()).toBe(".md, .txt, .docx or .html");
    expect(acceptAttribute()).toContain(".docx");
  });
});

describe("applyImport", () => {
  const body = { type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "b" }] }] };

  it("fills an empty headline with the file's title", () => {
    expect(applyImport("  ", { title: "T", body })).toEqual({ title: "T", body });
  });

  it("keeps a typed headline and moves the file's title into the body", () => {
    expect(applyImport("Mine", { title: "T", body }).body.content).toEqual([
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "T" }] },
      ...body.content,
    ]);
  });

  it("leaves the headline alone when the file has no title", () => {
    expect(applyImport("Mine", { title: null, body })).toEqual({ title: "Mine", body });
  });
});

import { describe, expect, test } from "vitest";
import type { TiptapDoc } from "@/core/db";
import { plainTextOf } from "./text";

describe("plainTextOf", () => {
  test("joins text across paragraphs and nested marks", () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }, { type: "text", text: "world" }] },
        { type: "paragraph", content: [{ type: "text", text: "Second paragraph." }] },
      ],
    };
    expect(plainTextOf(doc)).toBe("Hello world Second paragraph.");
  });

  test("is empty for a document with no content", () => {
    expect(plainTextOf({ type: "doc" })).toBe("");
  });
});

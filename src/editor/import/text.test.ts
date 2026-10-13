import { describe, expect, it } from "vitest";
import { textToWriting } from "./text";

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("textToWriting", () => {
  it("takes a short first line standing alone as the title", () => {
    const result = textToWriting("On Naps\r\n\r\nA nap is a small\nrebellion.\n\n\nSecond paragraph.\n");
    expect(result.title).toBe("On Naps");
    expect(result.body.content).toEqual([p("A nap is a small rebellion."), p("Second paragraph.")]);
  });

  it("does not take a title from a first paragraph that wraps or runs long", () => {
    expect(textToWriting("Line one\nline two\n\nMore.").title).toBeNull();
    expect(textToWriting(`${"word ".repeat(40)}\n\nMore.`).title).toBeNull();
  });

  it("does not turn a single paragraph into a title", () => {
    expect(textToWriting("Only this.")).toEqual({ title: null, body: { type: "doc", content: [p("Only this.")] } });
  });

  it("gives an empty file an empty document", () => {
    expect(textToWriting("﻿  \n\n ")).toEqual({ title: null, body: { type: "doc", content: [{ type: "paragraph" }] } });
  });
});

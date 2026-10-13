import { describe, expect, it } from "vitest";
import type { TiptapDoc } from "@/core/db";
import { BOLD, ITALIC, blockText, proseBlocks } from "./blocks";
import { cutToBudget } from "./text";

const text = (value: string, ...marks: string[]) => ({ type: "text", text: value, marks: marks.map((type) => ({ type })) });
const paragraph = (...content: unknown[]) => ({ type: "paragraph", content });
const heading = (...content: unknown[]) => ({ type: "heading", attrs: { level: 2 }, content });
const doc = (...content: unknown[]): TiptapDoc => ({ type: "doc", content });

describe("proseBlocks", () => {
  it("keeps the bold and italic a writer gave their words", () => {
    const [block] = proseBlocks(doc(paragraph(text("Plain "), text("bold and", "bold"), text(" both", "bold", "italic"))));
    expect(block.words).toEqual(["Plain", [["bold", BOLD]], [["and", BOLD]], [["both", BOLD + ITALIC]]]);
  });

  it("keeps a word whole when only part of it is marked, and ignores a link", () => {
    const [block] = proseBlocks(doc(paragraph(text("un"), text("believ", "italic"), text("able "), text("here", "link"))));
    expect(block.words).toEqual([[["un", 0], ["believ", ITALIC], ["able", 0]], "here"]);
    expect(blockText(block)).toBe("unbelievable here");
  });

  it("keeps the subheads between paragraphs, and none above the first or below the last", () => {
    const blocks = proseBlocks(
      doc(heading(text("Above")), paragraph(text("One.")), heading(text("Mid", "italic"), text("dle")), paragraph(text("Two.")), heading(text("Below"))),
    );
    expect(blocks).toEqual([{ words: ["One."] }, { heading: true, words: ["Middle"] }, { words: ["Two."] }]);
  });

  it("reads list items, and leaves out pull quotes and empty paragraphs", () => {
    const list = { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("Item"))] }] };
    const quote = { type: "blockquote", content: [paragraph(text("Quoted"))] };
    expect(proseBlocks(doc(paragraph(text("One")), paragraph(), quote, list)).map(blockText)).toEqual(["One", "Item"]);
  });
});

describe("cutToBudget", () => {
  const blocks = proseBlocks(
    doc(paragraph(text("aaaa bbbb cccc")), heading(text("Head")), paragraph(text("dddd "), text("eeee", "bold"))),
  );

  it("sends whole words up to the budget and its slack, and says how many the budget holds", () => {
    const cut = cutToBudget(blocks, 10_000);
    expect(cut).toMatchObject({ budgetWords: 6, truncated: false });
    expect(cut.blocks).toEqual(blocks);
  });

  it("stops inside a block and says the story goes on", () => {
    const cut = cutToBudget([{ words: Array(200).fill("word") }, { words: ["after"] }], 100);
    expect(cut.truncated).toBe(true);
    expect(cut.budgetWords).toBe(20);
    expect(cut.blocks).toHaveLength(1);
    expect(cut.blocks[0].words).toHaveLength(32);
  });
});

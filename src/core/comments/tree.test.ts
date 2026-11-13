import { describe, expect, it } from "vitest";
import { ThreadTree } from "./tree";

const node = (id: number, parentId: number, byWriter = false) => ({ id, parentId, byWriter });

describe("ThreadTree", () => {
  // 1 ─┬─ 2 ─── 4 (writer)
  //    └─ 3
  const tree = new ThreadTree([node(2, 1), node(3, 1), node(4, 2, true)]);

  it("sets each reply under the comment it answers, in order", () => {
    expect(tree.repliesTo(1).map((n) => n.id)).toEqual([2, 3]);
    expect(tree.repliesTo(2).map((n) => n.id)).toEqual([4]);
    expect(tree.repliesTo(4)).toEqual([]);
  });

  it("counts every reply beneath a comment and notes whether the writer is among them", () => {
    expect(tree.beneath(1)).toEqual({ replies: 3, writerReplied: true });
    expect(tree.beneath(3)).toEqual({ replies: 0, writerReplied: false });
    expect(tree.beneath(2)).toEqual({ replies: 1, writerReplied: true });
  });
});

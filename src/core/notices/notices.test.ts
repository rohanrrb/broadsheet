import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "../db";
import { createWriter } from "../writers";
import { MAX_NOTICES, countWords, listNotices, postNotice, removeNotice, tidyNotice } from ".";

let db: InstanceDb;
let ana: number;
beforeEach(() => {
  db = openInstance(":memory:");
  ana = createWriter(db, { name: "Ana", keyHash: "h" }).id;
});

const textsOn = (board: number | null) => listNotices(db, board).map((notice) => notice.text);

describe("a board", () => {
  it("lists its own notices, newest first", () => {
    postNotice(db, ana, "first", new Date(1000));
    postNotice(db, ana, "second", new Date(2000));
    postNotice(db, null, "from the paper", new Date(3000));
    expect(textsOn(ana)).toEqual(["second", "first"]);
    expect(textsOn(null)).toEqual(["from the paper"]);
  });

  it("drops its oldest notice when one more than it holds is posted", () => {
    for (let i = 0; i <= MAX_NOTICES; i++) postNotice(db, ana, `n${i}`, new Date(1000 + i));
    postNotice(db, null, "untouched", new Date(1));
    expect(textsOn(ana)).toHaveLength(MAX_NOTICES);
    expect(textsOn(ana)).not.toContain("n0");
    expect(textsOn(null)).toEqual(["untouched"]);
  });
});

describe("removeNotice", () => {
  it("takes a notice down only from the board named", () => {
    const notice = postNotice(db, ana, "mine");
    expect(removeNotice(db, notice.id, null)).toBe(false);
    expect(textsOn(ana)).toEqual(["mine"]);
    expect(removeNotice(db, notice.id, ana)).toBe(true);
    expect(textsOn(ana)).toEqual([]);
  });

  it("takes any notice down when no board is named", () => {
    const notice = postNotice(db, ana, "mine");
    expect(removeNotice(db, notice.id)).toBe(true);
    expect(removeNotice(db, notice.id)).toBe(false);
  });
});

describe("the limits", () => {
  it("counts words whatever separates them", () => {
    expect(countWords("  one\ntwo   three ")).toBe(3);
    expect(countWords("   ")).toBe(0);
    expect(tidyNotice(" a\n\n b ")).toBe("a b");
  });
});

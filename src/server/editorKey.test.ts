import { describe, expect, it } from "vitest";
import { editorAccess, hashKey, isValidKey, type EditorAccess } from "./editorKey";

const KEY = "a-long-enough-editor-key";
const HOST: EditorAccess = { kind: "host", key: KEY };
const CLAIMED: EditorAccess = { kind: "claimed", keyHash: hashKey(KEY) };
const UNCLAIMED: EditorAccess = { kind: "unclaimed" };

describe("editorAccess", () => {
  it("is unclaimed with no host key and no stored hash", () => {
    expect(editorAccess(null, undefined)).toEqual(UNCLAIMED);
    expect(editorAccess(null, "  ")).toEqual(UNCLAIMED);
    expect(editorAccess(null, "hunter2")).toEqual(UNCLAIMED);
  });

  it("uses the key chosen when the paper was claimed", () => {
    expect(editorAccess("scrypt:aa:bb", undefined)).toEqual({ kind: "claimed", keyHash: "scrypt:aa:bb" });
  });

  it("lets the host's key win, which is how a lost key is replaced", () => {
    expect(editorAccess("scrypt:aa:bb", ` ${KEY} `)).toEqual(HOST);
  });
});

describe("isValidKey", () => {
  it.each([["host", HOST], ["claimed", CLAIMED]])("accepts only the right key when %s", (_, access) => {
    expect(isValidKey(KEY, access)).toBe(true);
    expect(isValidKey(` ${KEY} `, access)).toBe(true);
    expect(isValidKey(`${KEY}x`, access)).toBe(false);
    expect(isValidKey(undefined, access)).toBe(false);
  });

  it("accepts nothing while the paper is unclaimed", () => {
    expect(isValidKey("", UNCLAIMED)).toBe(false);
    expect(isValidKey(KEY, UNCLAIMED)).toBe(false);
  });
});

describe("hashKey", () => {
  it("never holds the key itself, and salts it afresh each time", () => {
    expect(hashKey(KEY)).not.toContain(KEY);
    expect(hashKey(KEY)).not.toBe(hashKey(KEY));
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "@/core/db";
import { editorSessions } from "@/core/db/schema";
import { hashKey, type EditorAccess } from "./editorKey";
import { SESSION_DAYS, closeAllSessions, closeSession, isOpenSession, openSession } from "./editorSessions";

const KEY = "a-long-enough-editor-key";
const HOST: EditorAccess = { kind: "host", key: KEY };
const CLAIMED: EditorAccess = { kind: "claimed", keyHash: hashKey(KEY) };
const DAY_MS = 24 * 60 * 60 * 1000;

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
});

describe.each([["a host's key", HOST], ["a claimed key", CLAIMED]])("a session opened with %s", (_, access) => {
  it("is recognised by its token and by nothing else", () => {
    const token = openSession(db, access)!;
    expect(isOpenSession(db, token, access)).toBe(true);
    expect(isOpenSession(db, `${token}x`, access)).toBe(false);
    expect(isOpenSession(db, KEY, access)).toBe(false);
    expect(isOpenSession(db, undefined, access)).toBe(false);
  });

  it("is a different token each time, and each can be ended alone", () => {
    const [here, there] = [openSession(db, access)!, openSession(db, access)!];
    expect(here).not.toBe(there);
    closeSession(db, here, access);
    expect(isOpenSession(db, here, access)).toBe(false);
    expect(isOpenSession(db, there, access)).toBe(true);
  });

  it("ends after a month", () => {
    const opened = new Date("2026-01-01T00:00:00Z");
    const token = openSession(db, access, opened)!;
    expect(isOpenSession(db, token, access, new Date(opened.getTime() + (SESSION_DAYS - 1) * DAY_MS))).toBe(true);
    expect(isOpenSession(db, token, access, new Date(opened.getTime() + (SESSION_DAYS + 1) * DAY_MS))).toBe(false);
  });
});

describe("what the paper keeps of a session", () => {
  it("cannot be used as the token, so a copy of the file opens no desk", () => {
    const token = openSession(db, CLAIMED)!;
    const [stored] = db.select().from(editorSessions).all();
    expect(Object.values(stored)).not.toContain(token);
    expect(isOpenSession(db, stored.tokenHash, CLAIMED)).toBe(false);
  });

  it("holds nothing made from the key alone, so it cannot be used to guess the key", () => {
    openSession(db, HOST);
    openSession(db, HOST);
    const [first, second] = db.select().from(editorSessions).all();
    expect(Object.keys(first).sort()).toEqual(["expiresAt", "id", "tokenHash"]);
    expect(first.tokenHash).not.toBe(second.tokenHash);
    expect(JSON.stringify([first, second])).not.toContain(KEY);
  });
});

describe("changing the editor's key", () => {
  it("ends every session opened with the old one", () => {
    const hostToken = openSession(db, HOST)!;
    const claimedToken = openSession(db, CLAIMED)!;
    expect(isOpenSession(db, hostToken, { kind: "host", key: "another-long-editor-key" })).toBe(false);
    expect(isOpenSession(db, claimedToken, { kind: "claimed", keyHash: hashKey(KEY) })).toBe(false);
    expect(isOpenSession(db, claimedToken, HOST)).toBe(false);
  });
});

describe("signing out everywhere", () => {
  it("ends every session at once", () => {
    const tokens = [openSession(db, CLAIMED)!, openSession(db, CLAIMED)!];
    closeAllSessions(db);
    for (const token of tokens) expect(isOpenSession(db, token, CLAIMED)).toBe(false);
  });
});

describe("a paper nobody has claimed", () => {
  it("has no sessions", () => {
    expect(openSession(db, { kind: "unclaimed" })).toBeNull();
    expect(isOpenSession(db, openSession(db, HOST)!, { kind: "unclaimed" })).toBe(false);
  });
});

describe("opening a session", () => {
  it("clears away the ones that have run out", () => {
    const longAgo = new Date("2020-01-01T00:00:00Z");
    openSession(db, HOST, longAgo);
    openSession(db, HOST);
    expect(db.select().from(editorSessions).all()).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { getInstanceSettings, openInstance, type InstanceDb } from "@/core/db";
import { claimCode, claimPaper, isUnclaimed } from "./claim";
import { editorAccess, isValidKey } from "./editorKey";

const CODE = "ABCDE-FGHJK";
const KEY = "a key of my own choosing";

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
});

const access = () => editorAccess(getInstanceSettings(db).editorKeyHash, undefined);

describe("claimPaper", () => {
  it("sets the editor's key for a new paper, given the code", () => {
    expect(isUnclaimed(db)).toBe(true);
    expect(claimPaper(db, { code: " abcde fghjk ", key: KEY }, CODE)).toEqual({ ok: true });
    expect(access().kind).toBe("claimed");
    expect(isValidKey(KEY, access())).toBe(true);
    expect(getInstanceSettings(db).editorKeyHash).not.toContain(KEY);
  });

  it("refuses a wrong or missing code", () => {
    expect(claimPaper(db, { code: "ABCDE-FGHJX", key: KEY }, CODE)).toMatchObject({ ok: false, status: 401 });
    expect(claimPaper(db, { key: KEY }, CODE)).toMatchObject({ ok: false, status: 401 });
    expect(isUnclaimed(db)).toBe(true);
  });

  it("refuses a key too short to be a secret", () => {
    expect(claimPaper(db, { code: CODE, key: "short" }, CODE)).toMatchObject({ ok: false, status: 400 });
    expect(isUnclaimed(db)).toBe(true);
  });

  it("can only be done once", () => {
    claimPaper(db, { code: CODE, key: KEY }, CODE);
    expect(claimPaper(db, { code: CODE, key: "someone else's key!" }, CODE)).toMatchObject({ ok: false, status: 409 });
    expect(isValidKey(KEY, access())).toBe(true);
  });
});

describe("claimCode", () => {
  it("stays the same for the life of the process and is easy to type", () => {
    expect(claimCode()).toBe(claimCode());
    expect(claimCode()).toMatch(/^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
  });
});

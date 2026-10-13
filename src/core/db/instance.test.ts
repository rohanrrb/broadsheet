import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "drizzle-orm";
import { findWriter } from "../writers";
import { getInstanceSettings, openInstance, updateInstance, type InstanceDb } from "./instance";
import { writers } from "./schema";

describe("openInstance", () => {
  it("creates a migrated in-memory instance with default settings", () => {
    const db = openInstance(":memory:");
    expect(getInstanceSettings(db).name).toBe("Untitled");
  });

  it("persists to a file and can be reopened", () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "broadsheet-")), "instance.db");
    updateInstance(openInstance(file), { name: "My Paper", about: "Hello." });
    expect(getInstanceSettings(openInstance(file))).toMatchObject({ name: "My Paper", about: "Hello.", agents: "" });
  });
});

describe("handles folded by an older release", () => {
  /** A paper file holding writers as an older release stored them, opened again by this one. */
  function reopened(rows: [name: string, handle: string][]): InstanceDb {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "broadsheet-")), "paper.sqlite");
    const before = openInstance(file);
    for (const [name, handle] of rows) {
      before.run(sql`INSERT INTO writers (name, handle, key_hash, created_at) VALUES (${name}, ${handle}, 'h', 0)`);
    }
    before.$client.close();
    return openInstance(file);
  }

  it("are brought up to date, so a writer is still found by their name", () => {
    const db = reopened([["Tomás Reyes", "tomás-reyes"], ["Zoë", "zoë"], ["plain name", "plain-name"]]);
    expect(findWriter(db, "Tomás Reyes")?.handle).toBe("tomas-reyes");
    expect(findWriter(db, "Zoë")?.name).toBe("Zoë");
    expect(findWriter(db, "plain name")?.handle).toBe("plain-name");
  });

  it("leave the later of two names that now collide where it was", () => {
    const db = reopened([["Zoe", "zoe"], ["Zoë", "zoë"]]);
    expect(findWriter(db, "zoe")?.name).toBe("Zoe");
    expect(db.select().from(writers).all().map((writer) => writer.handle)).toEqual(["zoe", "zoë"]);
  });
});

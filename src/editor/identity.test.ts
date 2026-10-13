import { describe, expect, it } from "vitest";
import { IDENTITY_KEY, clearIdentity, parseIdentity, saveIdentity } from "./identity";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe("identity", () => {
  it("round-trips a pen name and key, and forgets on request", () => {
    const storage = memoryStorage();
    saveIdentity(storage, { name: "zebra_lord", key: "otter-velvet" });
    expect(parseIdentity(storage.getItem(IDENTITY_KEY))).toEqual({ name: "zebra_lord", key: "otter-velvet" });
    clearIdentity(storage);
    expect(parseIdentity(storage.getItem(IDENTITY_KEY))).toBeNull();
  });

  it.each([[null], ["not json"], ['{"name":"zebra_lord"}'], ['{"name":"","key":"k"}'], ["[]"]])(
    "reads %j as nobody",
    (raw) => {
      expect(parseIdentity(raw)).toBeNull();
    },
  );

  it("does not throw where storage is blocked", () => {
    expect(() => saveIdentity(null, { name: "a", key: "b" })).not.toThrow();
    expect(() => clearIdentity(null)).not.toThrow();
  });
});

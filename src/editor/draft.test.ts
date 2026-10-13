import { describe, expect, it } from "vitest";
import { clearDraft, draftKey, loadDraft, saveDraft, type Draft } from "./draft";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const draft: Draft = { title: "T", author: "A", body: { type: "doc", content: [] }, savedAt: 1 };

describe("drafts", () => {
  it("keys drafts per writing", () => {
    expect(draftKey(null)).toBe("broadsheet:draft:new");
    expect(draftKey(12)).toBe("broadsheet:draft:w12");
  });

  it("round-trips and clears a draft", () => {
    const storage = memoryStorage();
    saveDraft(storage, "k", draft);
    expect(loadDraft(storage, "k")).toEqual(draft);
    clearDraft(storage, "k");
    expect(loadDraft(storage, "k")).toBeNull();
  });

  it("ignores corrupt or foreign values", () => {
    const storage = memoryStorage();
    storage.setItem("a", "{not json");
    storage.setItem("b", JSON.stringify({ title: "x" }));
    expect(loadDraft(storage, "a")).toBeNull();
    expect(loadDraft(storage, "b")).toBeNull();
  });

  it("survives storage that is missing or throws", () => {
    const throwing = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("quota"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(() => saveDraft(throwing, "k", draft)).not.toThrow();
    expect(loadDraft(throwing, "k")).toBeNull();
    expect(loadDraft(null, "k")).toBeNull();
  });
});

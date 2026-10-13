import { describe, expect, it } from "vitest";
import { BROADSHEET_REPOSITORY, sourceUrl } from "./source";

describe("sourceUrl", () => {
  it("is the broadsheet repository unless a host names their own copy", () => {
    expect(sourceUrl(undefined)).toBe(BROADSHEET_REPOSITORY);
    expect(sourceUrl("https://example.com/broadsheet")).toBe("https://example.com/broadsheet");
  });

  it("ignores anything that is not a web address", () => {
    expect(sourceUrl("broadsheet")).toBe(BROADSHEET_REPOSITORY);
    expect(sourceUrl("javascript:alert(1)")).toBe(BROADSHEET_REPOSITORY);
  });
});

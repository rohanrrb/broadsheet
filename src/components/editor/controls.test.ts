import { describe, expect, it } from "vitest";
import { isImageUrl, normalizeHref } from "./controls";

describe("normalizeHref", () => {
  it("accepts web and mail links, adding a scheme where obvious", () => {
    expect(normalizeHref(" https://a.org/x ")).toBe("https://a.org/x");
    expect(normalizeHref("example.com/path")).toBe("https://example.com/path");
    expect(normalizeHref("ana@example.com")).toBe("mailto:ana@example.com");
  });

  it("rejects anything else", () => {
    expect(normalizeHref("javascript:alert(1)")).toBeNull();
    expect(normalizeHref("not a link")).toBeNull();
    expect(normalizeHref("")).toBeNull();
  });
});

describe("isImageUrl", () => {
  it("wants an http(s) address", () => {
    expect(isImageUrl("https://img.test/a.jpg")).toBe(true);
    expect(isImageUrl("data:image/png;base64,xx")).toBe(false);
    expect(isImageUrl("photo.jpg")).toBe(false);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "@/core/db";
import { MAX_IMAGES_PER_DAY, MAX_IMAGE_BYTES, findImage, isOwnImagePath } from "@/core/images";
import { normalizeDoc } from "@/editor/schema";
import { forgetAttempts } from "./attempts";
import { updatePaper } from "./desk";
import { uploadPaperImage, uploadWriterImage } from "./images";
import { registerWriter } from "./writers";

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
  forgetAttempts();
});

function register(name: string) {
  const result = registerWriter(db, { name });
  if (!result.ok) throw new Error(result.error);
  return { name, key: result.key };
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** A file that begins as a PNG does and runs to `size` bytes, as base64. */
const png = (size = 64) => Buffer.concat([Buffer.from(PNG), Buffer.alloc(size - PNG.length)]).toString("base64");

const nameOf = (url: string) => url.slice("/i/".length);

describe("uploadWriterImage", () => {
  it("keeps a writer's photo and answers with its address", () => {
    const result = uploadWriterImage(db, { ...register("Ana"), data: png() });
    if (!result.ok) throw new Error(result.error);
    expect(isOwnImagePath(result.url)).toBe(true);
    expect(findImage(db, nameOf(result.url))).toMatchObject({ type: "image/png" });
    expect(findImage(db, nameOf(result.url))!.bytes.byteLength).toBe(64);
  });

  it("refuses a wrong credential", () => {
    register("Ana");
    expect(uploadWriterImage(db, { name: "Ana", key: "not-it", data: png() })).toMatchObject({ status: 401 });
  });

  it("refuses what is not a photo, whatever it is called", () => {
    const ana = register("Ana");
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>1</script></svg>").toString("base64");
    expect(uploadWriterImage(db, { ...ana, data: svg, type: "image/png" })).toMatchObject({ status: 400 });
    expect(uploadWriterImage(db, ana)).toMatchObject({ status: 400 });
  });

  it("takes a photo of exactly the largest size, and not a byte more", () => {
    const ana = register("Ana");
    expect(uploadWriterImage(db, { ...ana, data: png(MAX_IMAGE_BYTES) })).toMatchObject({ ok: true });
    expect(uploadWriterImage(db, { ...ana, data: png(MAX_IMAGE_BYTES + 1) })).toMatchObject({ status: 413 });
    expect(uploadWriterImage(db, undefined)).toMatchObject({ status: 413 });
  });

  it("stops a writer at a day's worth, and lets them go on the next day", () => {
    const ana = register("Ana");
    const ben = register("Ben");
    const today = new Date("2026-05-01T12:00:00Z");
    for (let i = 0; i < MAX_IMAGES_PER_DAY; i++) {
      expect(uploadWriterImage(db, { ...ana, data: png() }, undefined, today)).toMatchObject({ ok: true });
    }
    expect(uploadWriterImage(db, { ...ana, data: png() }, undefined, today)).toMatchObject({ status: 429 });
    expect(uploadWriterImage(db, { ...ben, data: png() }, undefined, today)).toMatchObject({ ok: true });
    const tomorrow = new Date("2026-05-02T12:00:01Z");
    expect(uploadWriterImage(db, { ...ana, data: png() }, undefined, tomorrow)).toMatchObject({ ok: true });
  });
});

describe("an uploaded photo's address", () => {
  it("is taken in a piece, and no other address on the paper is", () => {
    const doc = (src: string) => ({ type: "doc" as const, content: [{ type: "image", attrs: { src } }] });
    expect(() => normalizeDoc(doc("/i/0123456789abcdef"))).not.toThrow();
    expect(() => normalizeDoc(doc("/api/desk/backup"))).toThrow();
    expect(() => normalizeDoc(doc("/i/../desk"))).toThrow();
  });

  it("is taken as the paper's comic", () => {
    const result = uploadPaperImage(db, { data: png() });
    if (!result.ok) throw new Error(result.error);
    expect(updatePaper(db, { comicImage: result.url })).toEqual({ ok: true });
    expect(updatePaper(db, { comicImage: "/somewhere/else.png" })).toMatchObject({ status: 400 });
    expect(updatePaper(db, { comicLink: result.url })).toMatchObject({ status: 400 });
  });
});

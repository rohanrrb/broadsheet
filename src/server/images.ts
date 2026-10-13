import type { InstanceDb } from "@/core/db";
import {
  MAX_IMAGES_PER_DAY,
  MAX_IMAGE_BYTES,
  countImagesSince,
  imagePath,
  sniffImageType,
  storeImage,
  type ImageType,
} from "@/core/images";
import { TooManyAttemptsError, UNKNOWN_CLIENT } from "./attempts";
import { fieldOf } from "./fields";
import { authenticateWriter } from "./writers";

/**
 * Where uploaded photos come in: untrusted JSON carrying the photo as base64,
 * out comes the address it is served at. A writer uploads with their name and
 * key; the editor's uploads are the route's to check.
 */

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; status: 400 | 401 | 413 | 429; error: string };

/** The largest request an upload can be: the largest photo as base64, and room for a name and key. */
export const MAX_UPLOAD_BODY_BYTES = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4_000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** {name, key, data}: keeps the photo for a writer. */
export function uploadWriterImage(
  db: InstanceDb,
  json: unknown,
  client: string = UNKNOWN_CLIENT,
  now: Date = new Date(),
): UploadResult {
  const photo = photoOf(json);
  if (!photo.ok) return photo;
  try {
    const writer = authenticateWriter(db, fieldOf(json, "name"), fieldOf(json, "key"), client);
    if (!writer) return { ok: false, status: 401, error: "That moniker and credential do not match." };
    if (countImagesSince(db, writer.id, new Date(now.getTime() - DAY_MS)) >= MAX_IMAGES_PER_DAY) {
      return { ok: false, status: 429, error: "That is enough photos for one day." };
    }
    return { ok: true, url: imagePath(storeImage(db, { writerId: writer.id, ...photo }, now).name) };
  } catch (error) {
    if (error instanceof TooManyAttemptsError) return { ok: false, status: 429, error: error.message };
    throw error;
  }
}

/** {data}: keeps the photo for the paper. For the editor; the route checks who is asking. */
export function uploadPaperImage(db: InstanceDb, json: unknown): UploadResult {
  const photo = photoOf(json);
  if (!photo.ok) return photo;
  return { ok: true, url: imagePath(storeImage(db, { writerId: null, ...photo }).name) };
}

type Photo = { ok: true; type: ImageType; bytes: Buffer } | { ok: false; status: 400 | 413; error: string };

function photoOf(json: unknown): Photo {
  // A body too large to read arrives here as no JSON at all.
  if (json === undefined) return { ok: false, status: 413, error: "That photo is too large." };
  const data = fieldOf(json, "data");
  if (typeof data !== "string" || !data) return { ok: false, status: 400, error: "No photo was sent." };
  const bytes = Buffer.from(data, "base64");
  if (bytes.byteLength > MAX_IMAGE_BYTES) return { ok: false, status: 413, error: "That photo is too large." };
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, status: 400, error: "A photo is a JPEG, PNG, WebP or GIF." };
  return { ok: true, type, bytes };
}

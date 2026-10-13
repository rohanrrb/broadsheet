import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/core/images/limits";
import type { Identity } from "@/editor/identity";

export type UploadReply = { ok: true; url: string } | { ok: false; error: string };

/** The file kinds the picker offers. */
export const IMAGE_ACCEPT = "image/*";

/** Longest side, then JPEG quality, tried in turn on a photo too large to send as it is. */
const SHRINK_STEPS = [
  [2000, 0.86],
  [1400, 0.8],
  [1000, 0.72],
] as const;

/**
 * Sends a photo to the paper and answers with its address there. A writer's
 * goes with their name and key; the editor's with the desk's session. A photo
 * too large to keep is made smaller first.
 */
export async function uploadImage(file: File, as: Identity | "editor"): Promise<UploadReply> {
  const photo = await fitted(file);
  if (!photo) return { ok: false, error: "Couldn't read that photo." };
  if (photo.size > MAX_IMAGE_BYTES) return { ok: false, error: "That photo is too large." };
  const data = await base64Of(photo);
  const [url, payload] = as === "editor" ? ["/api/desk/images", { data }] : ["/api/images", { ...as, data }];
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const reply = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (response.ok && reply.url) return { ok: true, url: reply.url };
    return { ok: false, error: reply.error ?? "That did not go through. Try again." };
  } catch {
    return { ok: false, error: "Could not reach the paper." };
  }
}

/** The file itself if the paper keeps its kind at its size; otherwise a smaller JPEG of it, or null if it cannot be read. */
async function fitted(file: File): Promise<Blob | null> {
  const kept = (IMAGE_TYPES as readonly string[]).includes(file.type);
  if (kept && file.size <= MAX_IMAGE_BYTES) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  let smallest: Blob | null = null;
  for (const [side, quality] of SHRINK_STEPS) {
    smallest = await redrawn(bitmap, side, quality);
    if (!smallest || smallest.size <= MAX_IMAGE_BYTES) break;
  }
  bitmap.close();
  return smallest;
}

function redrawn(bitmap: ImageBitmap, longestSide: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, longestSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  // JPEG has no clear pixels: what was see-through becomes paper white, not black.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function base64Of(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

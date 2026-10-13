/** The largest photo the paper keeps. The browser shrinks a bigger one before sending it. */
export const MAX_IMAGE_BYTES = 1_500_000;
/** How many photos one writer may upload in a day. */
export const MAX_IMAGES_PER_DAY = 40;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

const OWN_IMAGE = /^\/i\/[a-f0-9]{16}$/;

/** Whether `src` is the address of a photo uploaded to this paper. */
export function isOwnImagePath(src: string): boolean {
  return OWN_IMAGE.test(src);
}

export function imagePath(name: string): string {
  return `/i/${name}`;
}

/**
 * What kind of photo these bytes are, by how they begin; null if none the
 * paper keeps. What the sender calls the file is never asked.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const starts = (at: number, ...signature: number[]) => signature.every((byte, i) => bytes[at + i] === byte);
  if (starts(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0, 0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (starts(0, 0x52, 0x49, 0x46, 0x46) && starts(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return null;
}

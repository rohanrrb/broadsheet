import { findImage, imagePath, isOwnImagePath } from "@/core/images";
import { getInstance } from "@/server/instance";

/**
 * GET /i/:name → an uploaded photo. A name's photo never changes, so a
 * browser may keep it for good.
 */
export async function GET(_request: Request, context: RouteContext<"/i/[name]">) {
  const { name } = await context.params;
  const image = isOwnImagePath(imagePath(name)) ? findImage(getInstance(), name) : undefined;
  if (!image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "content-type": image.type,
      "cache-control": "public, max-age=31536000, immutable",
      "content-security-policy": "default-src 'none'",
    },
  });
}

import { clientOf, readJson } from "@/server/http";
import { MAX_UPLOAD_BODY_BYTES, uploadWriterImage } from "@/server/images";
import { getInstance } from "@/server/instance";

/**
 * POST /api/images {name, key, data} → 201 {url}. Keeps a writer's photo,
 * sent as base64, and answers with its address. 400 if it is not a photo;
 * 401 if the name and key do not match; 413 if it is too large; 429 after
 * too many wrong keys or too many photos in a day.
 */
export async function POST(request: Request) {
  const json = await readJson(request, MAX_UPLOAD_BODY_BYTES);
  const result = uploadWriterImage(getInstance(), json, clientOf(request));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ url: result.url }, { status: 201 });
}

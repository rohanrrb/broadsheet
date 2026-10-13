import { clientOf, readJson } from "@/server/http";
import { getInstance } from "@/server/instance";
import { postWriterNotice } from "@/server/notices";

/**
 * POST /api/notices {name, key, text} → 201. Pins a notice to the writer's
 * own bulletin. 400 if it is empty or too long; 401 if the name and key do
 * not match; 429 after too many wrong keys.
 */
export async function POST(request: Request) {
  const result = postWriterNotice(getInstance(), await readJson(request), clientOf(request));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return new Response(null, { status: 201 });
}

import { clientOf, readJson } from "@/server/http";
import { getInstance } from "@/server/instance";
import { registerWriter } from "@/server/writers";

/**
 * POST /api/writers {name?} → 201 {name, key}. Makes a pen name and its key;
 * the key is in this response and nowhere else, ever. No name: one is made up.
 * 429 when too many names have been taken lately.
 */
export async function POST(request: Request) {
  const json = await readJson(request);
  if (json === undefined) return Response.json({ error: "That request could not be read." }, { status: 400 });
  const result = registerWriter(getInstance(), json, clientOf(request));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ name: result.name, key: result.key }, { status: 201 });
}

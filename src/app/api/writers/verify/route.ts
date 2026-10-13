import { TooManyAttemptsError } from "@/server/attempts";
import { clientOf, readJson } from "@/server/http";
import { getInstance } from "@/server/instance";
import { authenticateWriter } from "@/server/writers";

/**
 * POST /api/writers/verify {name, key} → 200 {name} as the writer set it; 401
 * if they do not match; 429 after too many wrong keys.
 */
export async function POST(request: Request) {
  const json = ((await readJson(request)) ?? {}) as { name?: unknown; key?: unknown };
  try {
    const writer = authenticateWriter(getInstance(), json.name, json.key, clientOf(request));
    if (!writer) return Response.json({ error: "That moniker and credential do not match." }, { status: 401 });
    return Response.json({ name: writer.name });
  } catch (error) {
    if (error instanceof TooManyAttemptsError) return Response.json({ error: error.message }, { status: 429 });
    throw error;
  }
}

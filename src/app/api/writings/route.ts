import { getInstance } from "@/server/instance";
import { clientOf, readJson, saveResponse } from "@/server/http";
import { publishWriting } from "@/server/writings";

/**
 * POST /api/writings {title, body, name, key} → 201 {id, url}; 400 if it is
 * not a writing; 401 if the pen name and key do not match; 429 after too many
 * wrong keys.
 */
export async function POST(request: Request) {
  return saveResponse(publishWriting(getInstance(), await readJson(request), clientOf(request)), 201);
}

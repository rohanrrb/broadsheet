import { isEditor } from "@/server/editorSession";
import { getInstance } from "@/server/instance";
import { clientOf, readJson, saveResponse } from "@/server/http";
import { saveWritingEdit } from "@/server/writings";

/**
 * PATCH /api/writings/:id {title, body, key} → 200 {id, url}; 400 if it is
 * not a writing; 403 for anyone but its writer; 404 if it is missing or
 * spiked; 429 after too many wrong keys.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/writings/[id]">) {
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return Response.json({ error: "That writing no longer exists." }, { status: 404 });
  }
  const by = { editor: await isEditor(), client: clientOf(request) };
  return saveResponse(saveWritingEdit(getInstance(), id, await readJson(request), by), 200);
}

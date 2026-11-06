import { parseId, removeWriterComment } from "@/server/comments";
import { clientOf, readJson } from "@/server/http";
import { getInstance } from "@/server/instance";

/**
 * DELETE /api/comments/:id {name, key} → 204. Takes one of the writer's own
 * comments down. 401 if the name and key do not match; 404 if it is not
 * theirs or not there; 429 after too many wrong keys.
 */
export async function DELETE(request: Request, ctx: RouteContext<"/api/comments/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return Response.json({ error: "That comment is gone." }, { status: 404 });
  const result = removeWriterComment(getInstance(), id, await readJson(request), clientOf(request));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return new Response(null, { status: 204 });
}

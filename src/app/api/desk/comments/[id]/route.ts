import { parseId, removeAnyComment } from "@/server/comments";
import { deskResponse } from "@/server/http";
import { getInstance } from "@/server/instance";

/** DELETE /api/desk/comments/:id → 204. Takes any comment down. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/desk/comments/[id]">) {
  const id = parseId((await ctx.params).id);
  return deskResponse(() =>
    id === null ? { ok: false, status: 404, error: "That comment is gone." } : removeAnyComment(getInstance(), id),
  );
}

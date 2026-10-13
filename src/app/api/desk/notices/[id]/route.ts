import { deskResponse } from "@/server/http";
import { getInstance } from "@/server/instance";
import { parseNoticeId, removeAnyNotice } from "@/server/notices";

/** DELETE /api/desk/notices/:id → 204. Takes a notice off the paper's bulletin, or off a writer's. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/desk/notices/[id]">) {
  const id = parseNoticeId((await ctx.params).id);
  return deskResponse(() =>
    id === null ? { ok: false, status: 404, error: "That notice is gone." } : removeAnyNotice(getInstance(), id),
  );
}

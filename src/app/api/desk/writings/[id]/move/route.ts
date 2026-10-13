import { NO_SUCH_WRITING, moveInFeed, parseWritingId } from "@/server/desk";
import { deskResponse, readJson } from "@/server/http";
import { getInstance } from "@/server/instance";

/** POST /api/desk/writings/:id/move {above: id} | {below: id} → 204. Changes feed order only. */
export async function POST(request: Request, ctx: RouteContext<"/api/desk/writings/[id]/move">) {
  const id = parseWritingId((await ctx.params).id);
  return deskResponse(async () =>
    id === null ? NO_SUCH_WRITING : moveInFeed(getInstance(), id, await readJson(request)),
  );
}

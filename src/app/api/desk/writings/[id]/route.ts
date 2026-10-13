import { NO_SUCH_WRITING, chooseCover, parseWritingId, spikeOrRestore } from "@/server/desk";
import { deskResponse, readJson } from "@/server/http";
import { getInstance } from "@/server/instance";

/**
 * PATCH /api/desk/writings/:id → 204. {spiked} pulls a writing from the paper
 * or puts it back; {cover} puts it on the front page's cover or takes it off.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/desk/writings/[id]">) {
  const id = parseWritingId((await ctx.params).id);
  return deskResponse(async () => {
    if (id === null) return NO_SUCH_WRITING;
    const json = await readJson(request);
    const choosesCover = typeof json === "object" && json !== null && "cover" in json;
    return choosesCover ? chooseCover(getInstance(), id, json) : spikeOrRestore(getInstance(), id, json);
  });
}

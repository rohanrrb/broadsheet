import type { NextRequest } from "next/server";
import { getWriting } from "@/core/writings";
import { parseId, postWriterComment, readComments, readThread } from "@/server/comments";
import { isEditor } from "@/server/editorSession";
import { clientOf, readJson } from "@/server/http";
import { getInstance } from "@/server/instance";
import { todayConfig } from "@/widgets/config";

const GONE = { error: "That piece is gone." };

/**
 * GET /api/writings/:id/comments?order=newest|oldest&after=<id> → 200
 * {comments, next}: the next page of the piece's own comments.
 * GET /api/writings/:id/comments?thread=<id> → 200 {comments}: every reply
 * in the thread that comment begins. 404 if the piece is missing, or spiked
 * and the reader is not the editor, or the thread is not on it.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/writings/[id]/comments">) {
  const id = parseId((await ctx.params).id);
  const writing = id === null ? undefined : getWriting(getInstance(), id);
  if (!writing || (writing.spikedAt && !(await isEditor()))) return Response.json(GONE, { status: 404 });
  const params = request.nextUrl.searchParams;
  const { timeZone } = todayConfig().location;
  if (params.has("thread")) {
    const replies = readThread(getInstance(), writing, params.get("thread"), timeZone);
    return replies ? Response.json({ comments: replies }) : Response.json({ error: "That comment is gone." }, { status: 404 });
  }
  const query = { order: params.get("order") ?? undefined, after: params.get("after") ?? undefined };
  return Response.json(readComments(getInstance(), writing, query, timeZone));
}

/**
 * POST /api/writings/:id/comments {name, key, text, parent?} → 201
 * {comment}: a comment on the piece, or a reply to `parent`. 400 if it is
 * empty or too long; 401 if the name and key do not match; 404 if the piece
 * is missing or spiked, or `parent` is not a comment on it; 429 after too
 * many wrong keys or comments.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/writings/[id]/comments">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return Response.json(GONE, { status: 404 });
  const json = await readJson(request);
  const result = postWriterComment(getInstance(), id, json, todayConfig().location.timeZone, clientOf(request));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ comment: result.comment }, { status: 201 });
}

import type { DeskResult } from "./desk";
import { isEditor } from "./editorSession";
import { UNKNOWN_CLIENT } from "./attempts";
import type { SaveResult } from "./writings";

/** Longest address kept, so what is counted cannot be made large by a long header. */
const MAX_CLIENT_LENGTH = 64;

/**
 * Whoever sent the request, as far as the paper can tell: the last address in
 * `x-forwarded-for`, which is the one the host's own proxy wrote. Earlier
 * entries are whatever the sender claimed and are ignored. It is used only to
 * count attempts, never to decide who someone is; with no proxy saying, every
 * request counts as one sender.
 */
export function clientOf(request: Request): string {
  const last = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return last ? last.slice(0, MAX_CLIENT_LENGTH) : UNKNOWN_CLIENT;
}

/** Writings are text; anything bigger than this is not an article. */
const MAX_BODY_BYTES = 1_000_000;

/**
 * The request's JSON, or `undefined` if it is too large or not JSON. Requiring
 * exactly the JSON content type means a cross-site page cannot post here
 * without a CORS preflight, which these routes never grant. Only a route
 * that takes photos passes a larger `maxBytes`.
 */
export async function readJson(request: Request, maxBytes: number = MAX_BODY_BYTES): Promise<unknown> {
  if (mediaTypeOf(request) !== "application/json") return undefined;
  const raw = await readText(request, maxBytes);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function mediaTypeOf(request: Request): string {
  return (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
}

/** The body as text, read a piece at a time and given up on as soon as it passes `maxBytes`. */
async function readText(request: Request, maxBytes: number): Promise<string | undefined> {
  if (Number(request.headers.get("content-length")) > maxBytes) return undefined;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function saveResponse(result: SaveResult, successStatus: 200 | 201): Response {
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ id: result.id, url: `/w/${result.id}` }, { status: successStatus });
}

/**
 * Runs a desk change for the signed-in editor and answers 204, or the
 * change's own error. Anyone else gets a 401 and nothing happens.
 */
export async function deskResponse(change: () => DeskResult | Promise<DeskResult>): Promise<Response> {
  if (!(await isEditor())) {
    return Response.json({ error: "Sign in at the desk first." }, { status: 401 });
  }
  const result = await change();
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return new Response(null, { status: 204 });
}

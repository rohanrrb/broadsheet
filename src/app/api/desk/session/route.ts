import type { NextRequest } from "next/server";
import { TOO_MANY_ATTEMPTS, TooManyAttemptsError, guarded, limitsFor } from "@/server/attempts";
import { isValidKey } from "@/server/editorKey";
import { currentAccess, endEditorSession, startEditorSession } from "@/server/editorSession";
import { clientOf, readJson } from "@/server/http";

/** Wrong editor keys allowed in ten minutes from one address, or from everyone when no address is known. */
const WRONG_KEYS = { perAddress: 10, whenUnknown: 30 };

/** POST /api/desk/session {key} → 204 and the editor's session cookie; 401 for a wrong key; 429 after too many. */
export async function POST(request: Request) {
  const json = await readJson(request);
  const candidate = typeof json === "object" && json !== null ? (json as { key?: unknown }).key : undefined;
  const limits = limitsFor("wrong-editor-key", clientOf(request), WRONG_KEYS.perAddress, WRONG_KEYS.whenUnknown);
  try {
    if (!guarded(limits, () => isValidKey(candidate, currentAccess()))) {
      return Response.json({ error: "That is not this paper's editor key." }, { status: 401 });
    }
  } catch (error) {
    if (error instanceof TooManyAttemptsError) return Response.json({ error: TOO_MANY_ATTEMPTS }, { status: 429 });
    throw error;
  }
  await startEditorSession();
  return new Response(null, { status: 204 });
}

/** DELETE /api/desk/session → 204; signs this browser out. With `?everywhere`, and from a signed-in editor, every browser. */
export async function DELETE(request: NextRequest) {
  await endEditorSession({ everywhere: request.nextUrl.searchParams.has("everywhere") });
  return new Response(null, { status: 204 });
}

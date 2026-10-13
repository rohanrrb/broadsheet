import { TOO_MANY_ATTEMPTS, isBlocked, limitsFor, recordAttempt } from "@/server/attempts";
import { claimPaper } from "@/server/claim";
import { startEditorSession } from "@/server/editorSession";
import { clientOf, readJson } from "@/server/http";
import { getInstance } from "@/server/instance";

/** Wrong claim codes allowed in ten minutes from one address, or from everyone when no address is known. */
const WRONG_CODES = { perAddress: 10, whenUnknown: 30 };

/** POST /api/desk/claim {code, key} → 204 and the editor's session; once per paper; 429 after too many wrong codes. */
export async function POST(request: Request) {
  const limits = limitsFor("wrong-claim-code", clientOf(request), WRONG_CODES.perAddress, WRONG_CODES.whenUnknown);
  if (isBlocked(limits)) return Response.json({ error: TOO_MANY_ATTEMPTS }, { status: 429 });
  const result = claimPaper(getInstance(), await readJson(request));
  if (!result.ok) {
    if (result.status === 401) recordAttempt(limits);
    return Response.json({ error: result.error }, { status: result.status });
  }
  await startEditorSession();
  return new Response(null, { status: 204 });
}

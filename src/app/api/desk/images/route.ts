import { isEditor } from "@/server/editorSession";
import { readJson } from "@/server/http";
import { MAX_UPLOAD_BODY_BYTES, uploadPaperImage } from "@/server/images";
import { getInstance } from "@/server/instance";

/** POST /api/desk/images {data} → 201 {url}. Keeps a photo for the paper itself, sent as base64. */
export async function POST(request: Request) {
  if (!(await isEditor())) return Response.json({ error: "Sign in at the desk first." }, { status: 401 });
  const result = uploadPaperImage(getInstance(), await readJson(request, MAX_UPLOAD_BODY_BYTES));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ url: result.url }, { status: 201 });
}

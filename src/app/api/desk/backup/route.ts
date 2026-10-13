import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isEditor } from "@/server/editorSession";
import { getInstance } from "@/server/instance";

/**
 * GET /api/desk/backup → the whole paper as one SQLite file, for the editor
 * to keep. SQLite's own backup makes a consistent copy while the paper runs.
 */
export async function GET() {
  if (!(await isEditor())) return Response.json({ error: "Sign in at the desk first." }, { status: 401 });
  const copy = path.join(tmpdir(), `broadsheet-backup-${randomUUID()}.sqlite`);
  try {
    await getInstance().$client.backup(copy);
    return new Response(await readFile(copy), {
      headers: {
        "content-type": "application/vnd.sqlite3",
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="paper-${new Date().toISOString().slice(0, 10)}.sqlite"`,
      },
    });
  } finally {
    await rm(copy, { force: true });
  }
}

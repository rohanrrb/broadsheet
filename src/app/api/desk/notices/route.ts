import { deskResponse, readJson } from "@/server/http";
import { getInstance } from "@/server/instance";
import { postPaperNotice } from "@/server/notices";

/** POST /api/desk/notices {text} → 204. Pins a notice to the paper's own bulletin. */
export async function POST(request: Request) {
  return deskResponse(async () => postPaperNotice(getInstance(), await readJson(request)));
}

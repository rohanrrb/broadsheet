import { updatePaper } from "@/server/desk";
import { deskResponse, readJson } from "@/server/http";
import { getInstance } from "@/server/instance";

/**
 * PATCH /api/desk/instance {name?, earLeft?, earRight?, about?, agents?,
 * comicImage?, comicLink?, comicCredit?} → 204. The paper's name and own words.
 */
export async function PATCH(request: Request) {
  return deskResponse(async () => updatePaper(getInstance(), await readJson(request)));
}

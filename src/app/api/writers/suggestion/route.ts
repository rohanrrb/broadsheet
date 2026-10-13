import { connection } from "next/server";
import { getInstance } from "@/server/instance";
import { suggestName } from "@/server/writers";

/** GET /api/writers/suggestion → 200 {name}: a free moniker, offered and not reserved. A new one each time. */
export async function GET() {
  await connection();
  return Response.json({ name: suggestName(getInstance()) });
}

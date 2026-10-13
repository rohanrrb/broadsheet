import type { NextRequest } from "next/server";
import { InvalidFeedCursorError } from "@/feed/cursor";
import { readFeedPage } from "@/feed/feed";
import { getInstance } from "@/server/instance";

/** GET /api/feed?cursor=<token> → the next laid-out FeedView. */
export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  try {
    return Response.json(readFeedPage(getInstance(), cursor));
  } catch (error) {
    if (error instanceof InvalidFeedCursorError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

import { randomBytes } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import type { InstanceDb } from "../db/instance";
import { images } from "../db/schema";
import type { ImageType } from "./limits";

export type StoredImage = typeof images.$inferSelect;

/** Keeps a photo under a new random name. `writerId` is null for the editor's. */
export function storeImage(
  db: InstanceDb,
  image: { writerId: number | null; type: ImageType; bytes: Buffer },
  now: Date = new Date(),
): StoredImage {
  const name = randomBytes(8).toString("hex");
  return db.insert(images).values({ ...image, name, createdAt: now }).returning().get();
}

export function findImage(db: InstanceDb, name: string): StoredImage | undefined {
  return db.select().from(images).where(eq(images.name, name)).get();
}

/** How many photos a writer has uploaded since `since`. */
export function countImagesSince(db: InstanceDb, writerId: number, since: Date): number {
  const row = db
    .select({ n: count() })
    .from(images)
    .where(and(eq(images.writerId, writerId), gte(images.createdAt, since)))
    .get();
  return row?.n ?? 0;
}

import { mkdirSync } from "node:fs";
import path from "node:path";
import { openInstance, type InstanceDb } from "@/core/db";
import { claimCode, isUnclaimed } from "./claim";

/** The instance served when BROADSHEET_DB is unset: the local dev database. */
const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "dev.sqlite");

const globalForDb = globalThis as { broadsheetDb?: InstanceDb };

/** One connection per server process, reused across dev hot reloads. */
export function getInstance(): InstanceDb {
  globalForDb.broadsheetDb ??= openAt(process.env.BROADSHEET_DB ?? DEFAULT_DB_PATH);
  return globalForDb.broadsheetDb;
}

function openAt(filePath: string): InstanceDb {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const db = openInstance(filePath);
  // A paper nobody has claimed prints its claim code when it is first opened, which is on its first request.
  if (isUnclaimed(db)) claimCode();
  return db;
}

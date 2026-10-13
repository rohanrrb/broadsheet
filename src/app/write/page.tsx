import type { Metadata } from "next";
import { connection } from "next/server";
import { getInstanceSettings } from "@/core/db";
import { getInstance } from "@/server/instance";
import { WritingEditor } from "@/components/editor/WritingEditor";

export const metadata: Metadata = { title: "Write" };

export default async function WritePage() {
  // The instance name lives in SQLite: read it per request, not at build time.
  await connection();
  const { name } = getInstanceSettings(getInstance());
  return <WritingEditor instanceName={name} target={{ kind: "new" }} />;
}

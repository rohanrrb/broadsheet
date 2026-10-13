import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getInstanceSettings } from "@/core/db";
import { getInstance } from "@/server/instance";
import { PaperNote } from "@/components/PaperNote";

export const metadata: Metadata = { title: "Agent Directive" };

/** What this paper asks of AI agents, in its editor's words. A paper that has not said has no such page. */
export default async function AgentsPage() {
  await connection();
  const { name, agents } = getInstanceSettings(getInstance());
  if (!agents) notFound();
  return <PaperNote name={name} title="Agent Directive" markdown={agents} />;
}

import { getInstanceSettings, setCoverWriting, updateInstance, type InstanceChanges, type InstanceDb } from "@/core/db";
import { isOwnImagePath } from "@/core/images";
import { WritingNotFoundError, getWriting, moveWriting, setSpiked, type FeedPlacement } from "@/core/writings";
import { fieldOf } from "./fields";

/**
 * The editor's boundary: untrusted JSON from the desk in, a change to the
 * instance out. This is the whole of what an editor may change: the paper's
 * name and own words, the order of the feed, whether a writing is in print,
 * and which one is the cover. Dates, bylines and the format are
 * broadsheet's and have no entry here.
 */

export const MAX_INSTANCE_NAME_LENGTH = 40;

/** The paper's own words an editor can set, and how long each may run. */
export const PAPER_COPY_LIMITS = {
  earLeft: 80,
  earRight: 240,
  about: 5000,
  agents: 5000,
  comicImage: 500,
  comicLink: 500,
  comicCredit: 160,
} as const;
type CopyField = keyof typeof PAPER_COPY_LIMITS;

const COPY_NAMES: Record<CopyField, string> = {
  earLeft: "left ear",
  earRight: "right ear",
  about: "About page",
  agents: "agents page",
  comicImage: "comic image",
  comicLink: "comic link",
  comicCredit: "comic credit",
};

/** The fields that hold a web address: empty, or http(s) and nothing else. */
const ADDRESS_FIELDS: readonly CopyField[] = ["comicImage", "comicLink"];

export type DeskResult = { ok: true } | { ok: false; status: 400 | 404; error: string };

/**
 * Saves whichever of the paper's name and own words the request carries.
 * Nothing is saved unless every field sent is valid.
 */
export function updatePaper(db: InstanceDb, json: unknown): DeskResult {
  const changes: InstanceChanges = {};
  if (fieldOf(json, "name") !== undefined) {
    const name = typeof fieldOf(json, "name") === "string" ? tidy(fieldOf(json, "name") as string) : "";
    if (name.length === 0) return invalid("A paper needs a name.");
    if (name.length > MAX_INSTANCE_NAME_LENGTH) {
      return invalid(`Keep the name under ${MAX_INSTANCE_NAME_LENGTH} characters: it has to fit the nameplate.`);
    }
    changes.name = name;
  }
  for (const field of Object.keys(PAPER_COPY_LIMITS) as CopyField[]) {
    const value = fieldOf(json, field);
    if (value === undefined) continue;
    if (typeof value !== "string") return invalid(`The ${COPY_NAMES[field]} must be text.`);
    if (value.trim().length > PAPER_COPY_LIMITS[field]) {
      return invalid(`The ${COPY_NAMES[field]} is too long: keep it under ${PAPER_COPY_LIMITS[field]} characters.`);
    }
    const uploaded = field === "comicImage" && isOwnImagePath(value.trim());
    if (ADDRESS_FIELDS.includes(field) && value.trim() && !uploaded && !isWebAddress(value.trim())) {
      return invalid(`The ${COPY_NAMES[field]} must be a web address beginning http:// or https://.`);
    }
    changes[field] = value.trim();
  }
  if (Object.keys(changes).length === 0) return invalid("Nothing to save.");
  updateInstance(db, changes);
  return { ok: true };
}

export function moveInFeed(db: InstanceDb, id: number, json: unknown): DeskResult {
  const placement = parsePlacement(json);
  if (!placement) return invalid("Say which writing to move it above or below.");
  return attempt(() => moveWriting(db, id, placement));
}

export function spikeOrRestore(db: InstanceDb, id: number, json: unknown): DeskResult {
  const spiked = fieldOf(json, "spiked");
  if (typeof spiked !== "boolean") return invalid("Say whether the writing is spiked.");
  return attempt(() => setSpiked(db, id, spiked));
}

/**
 * {cover: true} puts the writing on the front page's cover; {cover: false}
 * takes it off and hands the choice back to the layout.
 */
export function chooseCover(db: InstanceDb, id: number, json: unknown): DeskResult {
  const cover = fieldOf(json, "cover");
  if (typeof cover !== "boolean") return invalid("Say whether the writing is the cover.");
  const writing = getWriting(db, id);
  if (!writing) return NO_SUCH_WRITING;
  if (cover && writing.spikedAt) return invalid("A spiked writing cannot be the cover.");
  if (cover) setCoverWriting(db, id);
  else if (getInstanceSettings(db).coverWritingId === id) setCoverWriting(db, null);
  return { ok: true };
}

/** A writing id from a route segment, or null if it cannot be one. */
export function parseWritingId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export const NO_SUCH_WRITING: DeskResult = { ok: false, status: 404, error: "That writing no longer exists." };

function parsePlacement(json: unknown): FeedPlacement | null {
  const [above, below] = [fieldOf(json, "above"), fieldOf(json, "below")];
  if (isId(above) && below === undefined) return { above };
  if (isId(below) && above === undefined) return { below };
  return null;
}

function attempt(change: () => unknown): DeskResult {
  try {
    change();
    return { ok: true };
  } catch (error) {
    if (error instanceof WritingNotFoundError) return NO_SUCH_WRITING;
    throw error;
  }
}

function isWebAddress(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function invalid(error: string): DeskResult {
  return { ok: false, status: 400, error };
}

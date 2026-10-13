/** Where broadsheet's code lives. */
export const BROADSHEET_REPOSITORY = "https://github.com/rohanrrb/broadsheet";

/**
 * Where an instance's About page sends would-be editors for the code: the
 * broadsheet repository, unless the host points BROADSHEET_SOURCE_URL at their
 * own copy. Anything that is not a web address is ignored.
 */
export function sourceUrl(setting: string | undefined = process.env.BROADSHEET_SOURCE_URL): string {
  try {
    const url = new URL(setting?.trim() ?? "");
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : BROADSHEET_REPOSITORY;
  } catch {
    return BROADSHEET_REPOSITORY;
  }
}

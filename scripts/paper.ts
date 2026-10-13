/**
 * `npm run paper -- export <file>` writes the paper's name and own words
 * (ears, About and agents pages) to a JSON file; `npm run paper -- import
 * <file>` reads one back. For an editor who wants those words kept, and
 * versioned, somewhere outside the paper's database. Writings are not
 * included: back those up with the database file.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getInstanceSettings, openInstance } from "../src/core/db";
import { updatePaper } from "../src/server/desk";

const DB_PATH = process.env.BROADSHEET_DB ?? path.join(process.cwd(), "data", "dev.sqlite");

function main(): void {
  const [action, file] = process.argv.slice(2);
  if ((action !== "export" && action !== "import") || !file) {
    console.error("Usage: npm run paper -- export|import <file.json>");
    process.exit(1);
  }
  const db = openInstance(DB_PATH);
  if (action === "export") {
    const { name, earLeft, earRight, about, agents } = getInstanceSettings(db);
    writeFileSync(file, `${JSON.stringify({ name, earLeft, earRight, about, agents }, null, 2)}\n`);
    console.log(`Wrote ${name}'s own words to ${file}`);
    return;
  }
  // Imports pass through the same checks as the desk's own form.
  const result = updatePaper(db, JSON.parse(readFileSync(file, "utf8")));
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(`Read ${getInstanceSettings(db).name}'s own words from ${file}`);
}

main();

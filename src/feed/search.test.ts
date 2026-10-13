import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "@/core/db";
import { createWriting, setSpiked } from "@/core/writings";
import { searchWritings, wordsOf } from "./search";

const doc = (text: string) => ({
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
});

const publish = (title: string, text: string, author = "ana") => createWriting(db, { title, author, body: doc(text) });
const found = (query: string) => searchWritings(db, query).map((w) => w.title);

describe("searchWritings", () => {
  it("finds pieces by headline, byline or text, whatever the case", () => {
    publish("The Last Ferry", "It stopped running in spring.");
    publish("Bus Lanes", "They work.", "zebra_lord");
    expect(found("FERRY")).toEqual(["The Last Ferry"]);
    expect(found("zebra_lord")).toEqual(["Bus Lanes"]);
    expect(found("spring")).toEqual(["The Last Ferry"]);
    expect(found("nothing here")).toEqual([]);
  });

  it("ignores accents, in the query and in the paper", () => {
    publish("Café Society", "Résumé of a long evening.", "Tomás Reyes");
    expect(found("cafe")).toEqual(["Café Society"]);
    expect(found("RESUME")).toEqual(["Café Society"]);
    expect(found("tomas")).toEqual(["Café Society"]);
    expect(found("café")).toEqual(["Café Society"]);
  });

  it("finds a word inside a longer one", () => {
    publish("Category Theory", "x");
    expect(found("cat")).toEqual(["Category Theory"]);
  });

  it("needs every word, and puts headline matches first", () => {
    publish("On Ferries", "A short note.");
    publish("Harbor Notes", "The ferry and the bus both run late.");
    publish("The Bus Ferry", "A bus that floats.");
    expect(found("ferry bus")).toEqual(["The Bus Ferry", "Harbor Notes"]);
  });

  it("leaves out spiked pieces and ignores an empty query", () => {
    const ferry = publish("The Last Ferry", "x");
    setSpiked(db, ferry.id, true);
    expect(found("ferry")).toEqual([]);
    expect(found("  ?! ")).toEqual([]);
  });
});

describe("wordsOf", () => {
  it("splits a query into lower-case words", () => {
    expect(wordsOf(" The  “Last” ferry! ")).toEqual(["the", "last", "ferry"]);
  });
});

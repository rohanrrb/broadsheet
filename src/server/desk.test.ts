import { beforeEach, describe, expect, it } from "vitest";
import { getInstanceSettings, openInstance, type InstanceDb } from "@/core/db";
import { createWriting, getWriting, listWritings, setSpiked } from "@/core/writings";
import { readFeedPage, readFeedPlan } from "@/feed/feed";
import { chooseCover, moveInFeed, parseWritingId, updatePaper, spikeOrRestore } from "./desk";

const body = { type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] };

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
});

const publish = (title: string) => createWriting(db, { title, author: "Ana", body });
const feed = () => listWritings(db).items.map((w) => w.title);

describe("updatePaper", () => {
  it("saves the paper's own words, trimmed, and leaves the rest alone", () => {
    expect(updatePaper(db, { about: "  We print anything.\n\n[Agents](/agents) ", earLeft: "“All the News”" })).toEqual({ ok: true });
    expect(getInstanceSettings(db)).toMatchObject({
      name: "Untitled",
      about: "We print anything.\n\n[Agents](/agents)",
      earLeft: "“All the News”",
      agents: "",
    });
  });

  it("saves nothing when any field is invalid", () => {
    expect(updatePaper(db, { name: "The Light", about: "x".repeat(5001) })).toMatchObject({ ok: false, status: 400 });
    expect(updatePaper(db, { about: 5 })).toMatchObject({ ok: false, status: 400 });
    expect(updatePaper(db, {})).toMatchObject({ ok: false, status: 400 });
    expect(getInstanceSettings(db)).toMatchObject({ name: "Untitled", about: "" });
  });

  it("saves a comic strip's addresses and credit, and refuses an address that is not a web one", () => {
    const comic = { comicImage: " https://example.com/strip.png ", comicLink: "https://example.com/1", comicCredit: "A. Artist, CC BY-NC" };
    expect(updatePaper(db, comic)).toEqual({ ok: true });
    expect(getInstanceSettings(db)).toMatchObject({ comicImage: "https://example.com/strip.png", comicCredit: "A. Artist, CC BY-NC" });
    expect(updatePaper(db, { comicLink: "javascript:alert(1)" })).toMatchObject({ ok: false, status: 400 });
    expect(updatePaper(db, { comicImage: "strip.png" })).toMatchObject({ ok: false, status: 400 });
    expect(updatePaper(db, { comicImage: "" })).toEqual({ ok: true });
    expect(getInstanceSettings(db).comicImage).toBe("");
  });

  it("tidies and saves the name", () => {
    expect(updatePaper(db, { name: "  The   Harbor Light " })).toEqual({ ok: true });
    expect(getInstanceSettings(db).name).toBe("The Harbor Light");
  });

  it.each([
    ["a blank name", { name: " " }, /needs a name/],
    ["a name too long for the nameplate", { name: "x".repeat(41) }, /under 40/],
    ["an empty request", "The Paper", /Nothing to save/],
  ])("rejects %s", (_, input, message) => {
    expect(updatePaper(db, input)).toMatchObject({ ok: false, status: 400, error: expect.stringMatching(message) });
    expect(getInstanceSettings(db).name).toBe("Untitled");
  });
});

describe("moveInFeed", () => {
  it("moves a writing above or below another", () => {
    const [a, , c] = ["a", "b", "c"].map(publish);
    expect(moveInFeed(db, a.id, { above: c.id })).toEqual({ ok: true });
    expect(feed()).toEqual(["a", "c", "b"]);
    expect(moveInFeed(db, a.id, { below: c.id })).toEqual({ ok: true });
    expect(feed()).toEqual(["c", "a", "b"]);
  });

  it("never touches the date, whatever the request carries", () => {
    const [a, b] = ["a", "b"].map(publish);
    moveInFeed(db, a.id, { above: b.id, createdAt: 0, position: 1 });
    expect(getWriting(db, a.id)?.createdAt).toEqual(a.createdAt);
  });

  it.each([[{}], [{ above: "2" }], [{ above: 1, below: 2 }], [null]])("rejects the placement %j", (input) => {
    expect(moveInFeed(db, publish("a").id, input)).toMatchObject({ ok: false, status: 400 });
  });

  it("reports a missing writing or anchor as a 404", () => {
    const a = publish("a");
    expect(moveInFeed(db, 999, { above: a.id })).toMatchObject({ ok: false, status: 404 });
    expect(moveInFeed(db, a.id, { above: 999 })).toMatchObject({ ok: false, status: 404 });
  });
});

describe("spikeOrRestore", () => {
  it("pulls a writing from the feed and puts it back", () => {
    const a = publish("a");
    expect(spikeOrRestore(db, a.id, { spiked: true })).toEqual({ ok: true });
    expect(feed()).toEqual([]);
    expect(spikeOrRestore(db, a.id, { spiked: false })).toEqual({ ok: true });
    expect(feed()).toEqual(["a"]);
  });

  it("rejects anything but a boolean, and reports a missing writing", () => {
    expect(spikeOrRestore(db, publish("a").id, { spiked: "yes" })).toMatchObject({ ok: false, status: 400 });
    expect(spikeOrRestore(db, 999, { spiked: true })).toMatchObject({ ok: false, status: 404 });
  });
});

describe("parseWritingId", () => {
  it("accepts positive integers only", () => {
    expect(parseWritingId("12")).toBe(12);
    expect(parseWritingId("0")).toBeNull();
    expect(parseWritingId("1.5")).toBeNull();
    expect(parseWritingId("abc")).toBeNull();
  });
});

describe("chooseCover", () => {
  const coverOf = () => readFeedPage(db).modules.find((m) => m.kind === "cover")?.article.id;

  it("puts the editor's choice on the cover, and gives the choice back when it is taken off", () => {
    const ids = ["One", "Two", "Three", "Four"].map((title) => publish(title).id);
    const layouts = coverOf();
    const chosen = ids.find((id) => String(id) !== layouts)!;

    expect(chooseCover(db, chosen, { cover: true })).toEqual({ ok: true });
    expect(coverOf()).toBe(String(chosen));
    expect(readFeedPlan(db).coverId).toBe(String(chosen));

    expect(chooseCover(db, chosen, { cover: false })).toEqual({ ok: true });
    expect(coverOf()).toBe(layouts);
  });

  it("leaves another writing's place on the cover alone when one that is not on it is taken off", () => {
    const [one, two] = [publish("One").id, publish("Two").id];
    chooseCover(db, one, { cover: true });
    expect(chooseCover(db, two, { cover: false })).toEqual({ ok: true });
    expect(getInstanceSettings(db).coverWritingId).toBe(one);
  });

  it("falls back to the layout's choice while the chosen writing is spiked", () => {
    const [one, two] = [publish("One").id, publish("Two").id];
    chooseCover(db, one, { cover: true });
    setSpiked(db, one, true);
    expect(coverOf()).toBe(String(two));
    setSpiked(db, one, false);
    expect(coverOf()).toBe(String(one));
  });

  it("refuses a spiked writing, a missing one, and a request that does not say", () => {
    const { id } = publish("One");
    setSpiked(db, id, true);
    expect(chooseCover(db, id, { cover: true })).toMatchObject({ ok: false, status: 400 });
    expect(chooseCover(db, 999, { cover: true })).toMatchObject({ ok: false, status: 404 });
    expect(chooseCover(db, id, {})).toMatchObject({ ok: false, status: 400 });
  });
});

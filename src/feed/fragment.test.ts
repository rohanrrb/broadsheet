import { describe, expect, it } from "vitest";
import { continuedAt } from "./fragment";

const words = (text: string) => text.split(" ");
/** The fragment as read: [context, marked words], decoded. */
function parts(href: string): [string, string] {
  const fragment = href.split("#:~:text=")[1];
  const [first, second] = fragment.split("-,");
  return second === undefined ? ["", decodeURIComponent(first)] : [decodeURIComponent(first), decodeURIComponent(second)];
}

describe("continuedAt", () => {
  it("marks the last six words shown, with the three before them as context", () => {
    const href = continuedAt("/by/ana/bus-lanes", [words("the number nine bus is late again and nobody knows why today")]);
    expect(href.startsWith("/by/ana/bus-lanes#:~:text=")).toBe(true);
    expect(parts(href)).toEqual(["bus is late", "again and nobody knows why today"]);
  });

  it("lengthens the context until no earlier place reads the same", () => {
    const refrain = "and so it goes on and on and on again";
    const shown = [words(`First ${refrain} but then second ${refrain}`)];
    expect(parts(continuedAt("/w/1", shown))).toEqual(["second and so it goes", "on and on and on again"]);
  });

  it("reaches into the blocks before when the paragraph alone is not enough", () => {
    const shown = [words("One fish two fish."), words("Red herring here."), words("One fish two fish.")];
    expect(parts(continuedAt("/w/1", shown))).toEqual(["here.", "One fish two fish."]);
  });

  it("gives no context when the paragraph has none to give and the words are its own", () => {
    expect(parts(continuedAt("/w/1", [words("An opening paragraph."), words("Then this")]))).toEqual(["", "Then this"]);
  });

  it("escapes what a fragment would read as its own syntax", () => {
    expect(continuedAt("/w/1", [["well-known,", "R&D"]])).toBe("/w/1#:~:text=well%2Dknown%2C%20R%26D");
  });

  it("leaves the address alone when no words were shown", () => {
    expect(continuedAt("/w/1", [])).toBe("/w/1");
    expect(continuedAt("/w/1", [[]])).toBe("/w/1");
  });
});

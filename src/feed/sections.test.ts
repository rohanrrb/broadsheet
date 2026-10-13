import { describe, expect, it } from "vitest";
import { sectionOf } from "./sections";

describe("sectionOf", () => {
  it("lifts an opinion prefix out of the headline", () => {
    expect(sectionOf("Opinion: Four-Day School Weeks Deserve a Harder Look")).toEqual({
      kicker: "Opinion",
      voice: "opinion",
      headline: "Four-Day School Weeks Deserve a Harder Look",
    });
    expect(sectionOf("Letter: The Bike Lanes Are Working").kicker).toBe("Letters");
    expect(sectionOf("Letter From the Coast: Winter Light")).toMatchObject({
      kicker: "Letter From the Coast",
      headline: "Winter Light",
    });
  });

  it("keeps other colons in the headline and picks a desk by keyword", () => {
    expect(sectionOf("Sourdough, Year Three: A Progress Report")).toMatchObject({
      kicker: "Food",
      voice: "news",
      headline: "Sourdough, Year Three: A Progress Report",
    });
    expect(sectionOf("Council Delays Vote on Downtown Parking Plan").kicker).toBe("Metro");
    expect(sectionOf("Something Unclassifiable").kicker).toBe("Dispatches");
  });
});

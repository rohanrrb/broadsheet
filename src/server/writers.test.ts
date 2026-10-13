import { beforeEach, describe, expect, it } from "vitest";
import { openInstance, type InstanceDb } from "@/core/db";
import { MAX_NAME_LENGTH, findWriter } from "@/core/writers";
import { authenticateWriter, newKey, placeholderNames, registerWriter, suggestName } from "./writers";
import { TooManyAttemptsError, forgetAttempts } from "./attempts";
import { WORDS } from "./words";

let db: InstanceDb;
beforeEach(() => {
  db = openInstance(":memory:");
  forgetAttempts();
});

function register(name?: string, client?: string) {
  const result = registerWriter(db, name === undefined ? {} : { name }, client);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("the word list", () => {
  it("has one distinct word for every byte", () => {
    expect(WORDS).toHaveLength(256);
    expect(new Set(WORDS).size).toBe(256);
  });
});

describe("registerWriter", () => {
  it("gives a chosen name a six-word key, and keeps only its hash", () => {
    const { name, key } = register("  Zebra   Lord ");
    expect(name).toBe("Zebra Lord");
    expect(key).toMatch(/^[a-z]+(-[a-z]+){5}$/);
    expect(findWriter(db, "zebra_lord")?.keyHash).not.toContain(key);
  });

  it("names a writer who did not choose, from their key", () => {
    const { name, key } = register();
    expect(name).toBe(placeholderNames(key)[0]);
    expect(name).toMatch(/^[a-z]+-[a-z]+$/);
  });

  it("refuses a name that is taken, however it is typed", () => {
    register("zebra_lord");
    expect(registerWriter(db, { name: "Zebra Lord" })).toMatchObject({ ok: false, status: 409 });
  });

  it.each([["x"], ["a".repeat(MAX_NAME_LENGTH + 1)], ["zebra@lord"], ["<b>"]])("refuses the name %j", (name) => {
    expect(registerWriter(db, { name })).toMatchObject({ ok: false, status: 400 });
  });
});

describe("authenticateWriter", () => {
  it("knows a writer by name and key, typed loosely", () => {
    const { key } = register("zebra_lord");
    expect(authenticateWriter(db, "Zebra Lord", key)?.name).toBe("zebra_lord");
    expect(authenticateWriter(db, "zebra_lord", ` ${key.toUpperCase().replaceAll("-", " ")} `)?.name).toBe("zebra_lord");
  });

  it("knows nobody by a wrong key, a missing key, or an unknown name", () => {
    const { key } = register("zebra_lord");
    register("quiet_harbor");
    expect(authenticateWriter(db, "zebra_lord", newKey())).toBeNull();
    expect(authenticateWriter(db, "zebra_lord", undefined)).toBeNull();
    expect(authenticateWriter(db, "quiet_harbor", key)).toBeNull();
    expect(authenticateWriter(db, "nobody", key)).toBeNull();
  });
});

describe("suggestName", () => {
  it("offers two words nobody is writing under, and takes nothing", () => {
    const name = suggestName(db);
    expect(name).toMatch(/^[a-z]+-[a-z]+$/);
    expect(suggestName(db, () => Uint8Array.of(3, 4))).toBe(suggestName(db, () => Uint8Array.of(3, 4)));
    expect(register(name).name).toBe(name);
  });

  it("passes over a name that is taken", () => {
    const taken = suggestName(db, () => Uint8Array.of(3, 4));
    register(taken);
    const picks = [Uint8Array.of(3, 4), Uint8Array.of(5, 6)];
    expect(suggestName(db, () => picks.shift()!)).toBe(suggestName(db, () => Uint8Array.of(5, 6)));
  });
});

describe("guessing at a key", () => {
  it("is refused after ten wrong keys from one address, whoever they were aimed at", () => {
    const [ana, ben] = [register("Ana"), register("Ben")];
    for (let i = 0; i < 10; i++) expect(authenticateWriter(db, "Ana", "wrong", "1.2.3.4")).toBeNull();
    expect(() => authenticateWriter(db, "Ben", ben.key, "1.2.3.4")).toThrow(TooManyAttemptsError);
    expect(authenticateWriter(db, "Ana", ana.key, "5.6.7.8")?.name).toBe("Ana");
  });

  it("cannot be used to shut a writer out: wrong keys from other addresses cost them nothing", () => {
    const ana = register("Ana");
    for (let i = 0; i < 200; i++) authenticateWriter(db, "Ana", "wrong", `10.0.${i % 250}.${i}`);
    expect(authenticateWriter(db, "Ana", ana.key, "5.6.7.8")?.name).toBe("Ana");
  });

  it("is counted for everyone together only when no address is known", () => {
    const ana = register("Ana");
    for (let i = 0; i < 60; i++) expect(authenticateWriter(db, "Ana", "wrong")).toBeNull();
    expect(() => authenticateWriter(db, "Ana", ana.key)).toThrow(TooManyAttemptsError);
    expect(authenticateWriter(db, "Ana", ana.key, "5.6.7.8")?.name).toBe("Ana");
  });

  it("costs nothing when the key is right or the name is nobody's", () => {
    const ana = register("Ana");
    for (let i = 0; i < 30; i++) {
      expect(authenticateWriter(db, "Ana", ana.key, "1.2.3.4")?.name).toBe("Ana");
      expect(authenticateWriter(db, "Nobody", "wrong", "1.2.3.4")).toBeNull();
    }
  });
});

describe("taking names", () => {
  it("stops after ten from one address in ten minutes", () => {
    for (let i = 0; i < 10; i++) expect(registerWriter(db, {}, "1.2.3.4").ok).toBe(true);
    expect(registerWriter(db, {}, "1.2.3.4")).toMatchObject({ ok: false, status: 429 });
    expect(registerWriter(db, {}, "5.6.7.8").ok).toBe(true);
  });

  it("counts asking for a taken name too, which costs the asker a try and the paper no hash", () => {
    register("Ana", "9.9.9.9");
    for (let i = 0; i < 10; i++) expect(registerWriter(db, { name: "Ana" }, "1.2.3.4")).toMatchObject({ status: 409 });
    expect(registerWriter(db, { name: "Ben" }, "1.2.3.4")).toMatchObject({ ok: false, status: 429 });
  });

  it("does not count a name that could never be one", () => {
    for (let i = 0; i < 15; i++) expect(registerWriter(db, { name: "x" }, "1.2.3.4")).toMatchObject({ status: 400 });
    expect(registerWriter(db, { name: "Ben" }, "1.2.3.4").ok).toBe(true);
  });
});

describe("the length of a name", () => {
  it("stops at what a writer's page can set on one line", () => {
    expect(register("a".repeat(MAX_NAME_LENGTH)).name).toHaveLength(MAX_NAME_LENGTH);
    expect(registerWriter(db, { name: "a".repeat(MAX_NAME_LENGTH + 1) })).toMatchObject({ ok: false, status: 400 });
  });

  it("is never exceeded by a name the paper makes up", () => {
    const longest = [...WORDS].sort((a, b) => b.length - a.length)[0];
    const offered = [...placeholderNames("any-key"), suggestName(db)];
    for (const name of offered) expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    expect(`${longest}-${longest}-99`.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
  });
});

describe("names that pass for another", () => {
  it("are the same name when only the form of the letters differs", () => {
    register("magma");
    expect(registerWriter(db, { name: "ｍａｇｍａ" })).toMatchObject({ ok: false, status: 409 });
  });

  it.each(["magma\u3164", "\u3164\u3164", "ma\u1160gma"])("are refused when made with a letter that prints as nothing (%#)", (name) => {
    expect(registerWriter(db, { name })).toMatchObject({ ok: false, status: 400 });
  });

  it.each(["m\u0430gma", "\u039Cagma", "\u05D0\u05D1", "\u674E\u96F7", "magma\u0663", "ma|gma", "ma\u01C0gma"])(
    "are refused when written with anything but the Latin alphabet (%s)",
    (name) => {
      expect(registerWriter(db, { name })).toMatchObject({ ok: false, status: 400 });
    },
  );
});

describe("a name written another way", () => {
  it.each([
    ["magma", "mágma"],
    ["magma", "m\u0251gma"],
    ["magma", "MA\u0262MA"],
    ["Tomás Reyes", "Tomas Reyes"],
    ["Tomas Reyes", "TOMÁS_REYES"],
    ["Zoe", "Zoë"],
    ["Strasse", "Straße"],
    ["Lukasz", "Łukasz"],
  ])("cannot be taken once %s is: %s", (taken, wanted) => {
    register(taken);
    expect(registerWriter(db, { name: wanted })).toMatchObject({ ok: false, status: 409 });
  });

  it("still finds a writer by their name as they wrote it", () => {
    register("Tomás Reyes");
    expect(findWriter(db, "Tomás Reyes")?.name).toBe("Tomás Reyes");
    expect(findWriter(db, "tomas-reyes")?.handle).toBe("tomas-reyes");
  });
});

describe("a name the fold cannot make plain", () => {
  it.each(["a\u019Aice", "\u0249ess", "\u01A5eter", "\u023Ann", "_magma", "magma-", "--", "- -"])(
    "is refused (%s)",
    (name) => {
      expect(registerWriter(db, { name })).toMatchObject({ ok: false, status: 400 });
    },
  );
});

describe("the letters a name may use", () => {
  it.each([
    "Tomás Reyes",
    "Zoë Müller-Łukasz",
    "Søren Åström",
    "Nguyễn Thị",
    "Ștefan Țurcanu",
    "İpek Çağrı",
    "Kɔku Ɗanjuma",
    "Þórdís Ægisdóttir",
    "writer_42",
  ])(
    "include those of %s",
    (name) => {
      expect(register(name).name).toBe(name);
    },
  );

  it("are kept in one form, however they were typed", () => {
    expect(register("Jose\u0301").name).toBe("Jos\u00E9");
  });
});

describe("hyphens in names", () => {
  it("are allowed, and count as the same name as a space or an underscore", () => {
    expect(register("zebra-lord").name).toBe("zebra-lord");
    expect(findWriter(db, "Zebra_Lord")?.name).toBe("zebra-lord");
    expect(registerWriter(db, { name: "zebra lord" })).toMatchObject({ ok: false, status: 409 });
  });
});

describe("placeholderNames", () => {
  it("is the same for the same key, with numbered fallbacks", () => {
    const names = placeholderNames("otter-velvet-lamp-harbor-seven-oak");
    expect(names).toEqual(placeholderNames("otter-velvet-lamp-harbor-seven-oak"));
    expect(names[1]).toMatch(new RegExp(`^${names[0]}-\\d+$`));
  });
});

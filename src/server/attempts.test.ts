import { beforeEach, describe, expect, it } from "vitest";
import { ATTEMPT_WINDOW_MS, TooManyAttemptsError, forgetAttempts, guarded, isBlocked, recordAttempt } from "./attempts";

const limits = [{ key: "wrong-key:1.1.1.1", limit: 3 }];
const wrong = () => false;
const right = () => true;

beforeEach(forgetAttempts);

describe("guarded", () => {
  it("lets a right guess through as often as it likes", () => {
    for (let i = 0; i < 20; i++) expect(guarded(limits, right)).toBe(true);
  });

  it("stops checking once enough guesses have been wrong, even a right one", () => {
    let checks = 0;
    const count = (answer: boolean) => () => (checks++, answer);
    for (let i = 0; i < 3; i++) expect(guarded(limits, count(false))).toBe(false);
    expect(() => guarded(limits, count(true))).toThrow(TooManyAttemptsError);
    expect(checks).toBe(3);
  });

  it("checks again once the wrong guesses are old", () => {
    for (let i = 0; i < 3; i++) guarded(limits, wrong, 1_000);
    expect(() => guarded(limits, right, 1_000 + ATTEMPT_WINDOW_MS - 1)).toThrow(TooManyAttemptsError);
    expect(guarded(limits, right, 1_000 + ATTEMPT_WINDOW_MS)).toBe(true);
  });

  it("counts each thing apart, and stops at whichever limit is reached first", () => {
    const both = [...limits, { key: "wrong-editor-key:1.1.1.1", limit: 2 }];
    guarded(both, wrong);
    guarded(both, wrong);
    expect(isBlocked([{ key: "wrong-editor-key:1.1.1.1", limit: 2 }])).toBe(true);
    expect(isBlocked(limits)).toBe(false);
    expect(() => guarded(both, right)).toThrow(TooManyAttemptsError);
    expect(guarded([{ key: "wrong-key:2.2.2.2", limit: 3 }], right)).toBe(true);
  });
});

describe("recordAttempt", () => {
  it("does not grow without end when flooded with things to count", () => {
    for (let i = 0; i < 25_000; i++) recordAttempt([{ key: `client:${i}`, limit: 10 }]);
    expect(isBlocked([{ key: "client:24999", limit: 1 }])).toBe(true);
    expect(isBlocked([{ key: "client:0", limit: 1 }])).toBe(false);
  });
});

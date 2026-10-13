import { describe, expect, it } from "vitest";
import { clientOf, readJson } from "./http";

const post = (body: BodyInit, headers: Record<string, string> = { "content-type": "application/json" }) =>
  new Request("http://paper.test/api", { method: "POST", body, headers });

describe("clientOf", () => {
  const from = (forwarded?: string) =>
    clientOf(new Request("http://paper.test/", { headers: forwarded ? { "x-forwarded-for": forwarded } : {} }));

  it("is the address the host's proxy wrote, not one the sender claimed", () => {
    expect(from("203.0.113.9")).toBe("203.0.113.9");
    expect(from("1.1.1.1, 2.2.2.2, 203.0.113.9")).toBe("203.0.113.9");
  });

  it("is unknown without a proxy", () => {
    expect(from()).toBe("unknown");
    expect(from(" ")).toBe("unknown");
  });

  it("is never long", () => {
    expect(from("x".repeat(5_000)).length).toBeLessThanOrEqual(64);
  });
});

describe("readJson", () => {
  it("reads JSON sent as JSON", async () => {
    expect(await readJson(post('{"name":"Ana"}'))).toEqual({ name: "Ana" });
    expect(await readJson(post('{"name":"Ana"}', { "content-type": "application/json; charset=utf-8" }))).toEqual({ name: "Ana" });
  });

  it.each(["text/plain", "text/plain; application/json", "application/jsonx", ""])(
    "ignores a body not sent as exactly JSON (%s)",
    async (type) => {
      expect(await readJson(post('{"name":"Ana"}', type ? { "content-type": type } : {}))).toBeUndefined();
    },
  );

  it("ignores what is not JSON", async () => {
    expect(await readJson(post("{nope"))).toBeUndefined();
  });

  it("gives up on a body past a megabyte, whatever length it claims", async () => {
    const big = JSON.stringify({ text: "x".repeat(1_200_000) });
    expect(await readJson(post(big))).toBeUndefined();
    let sent = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        controller.enqueue(new Uint8Array(100_000).fill(120));
      },
    });
    const request = new Request("http://paper.test/api", {
      method: "POST",
      body: endless,
      headers: { "content-type": "application/json" },
      duplex: "half",
    } as RequestInit);
    expect(await readJson(request)).toBeUndefined();
    expect(sent).toBeLessThan(20);
  });
});

/** GETs JSON, failing on any non-2xx status. Callers pass a signal that times out. */
export async function fetchJson(url: string, signal: AbortSignal, headers: HeadersInit = {}): Promise<unknown> {
  const response = await fetch(url, { signal, headers, cache: "no-store" });
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);
  return response.json();
}

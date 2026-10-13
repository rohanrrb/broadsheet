/** One field of a request's JSON, or `undefined` if the JSON is not an object or has no such field. */
export function fieldOf(json: unknown, name: string): unknown {
  const isRecord = typeof json === "object" && json !== null && !Array.isArray(json);
  return isRecord ? (json as Record<string, unknown>)[name] : undefined;
}

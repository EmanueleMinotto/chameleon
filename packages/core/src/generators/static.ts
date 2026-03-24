import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { StaticAnnotation } from "../schema/types.js";

const fileCache = new Map<string, unknown>();

/**
 * Resolves a static annotation:
 * - If the value is a string ending in ".json", loads and caches the file.
 * - Otherwise returns the literal value.
 */
export async function resolveStatic(
  annotation: StaticAnnotation,
  staticDataStore?: Record<string, unknown>,
): Promise<unknown> {
  const val = annotation.static;

  if (typeof val !== "string" || !val.endsWith(".json")) {
    return val;
  }

  // Check pre-loaded store first (used in Vercel manifest context)
  if (staticDataStore) {
    const fromStore = staticDataStore[val] ?? staticDataStore[resolve(val)];
    if (fromStore !== undefined) return fromStore;
  }

  // In-process file cache
  if (fileCache.has(val)) return fileCache.get(val);

  try {
    const content = await readFile(val, "utf-8");
    const parsed = JSON.parse(content) as unknown;
    fileCache.set(val, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/** Pre-warm the static cache from a pre-built manifest. */
export function warmStaticCache(staticData: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(staticData)) {
    fileCache.set(key, value);
    fileCache.set(resolve(key), value);
  }
}

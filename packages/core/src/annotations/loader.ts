import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { parse as parseYaml } from "yaml";
import deepmerge from "deepmerge";
import type { AnnotationMap } from "../schema/types.js";

/**
 * Loads and deep-merges all annotation files matching the given pattern(s).
 * Accepts a string path, glob pattern, or array of paths/globs.
 */
export async function loadAnnotations(patterns: string | string[]): Promise<AnnotationMap> {
  const list = Array.isArray(patterns) ? patterns : [patterns];

  // Expand globs; non-glob paths are returned as-is if they exist
  const files = await fg(list, { dot: false, onlyFiles: true });

  // If no glob matches but literal paths were passed, fall back to them directly
  const toRead = files.length > 0 ? files : list;

  let merged: AnnotationMap = {};

  for (const file of toRead) {
    try {
      const content = await readFile(file, "utf-8");
      const parsed = parseYaml(content) as AnnotationMap;
      if (parsed && typeof parsed === "object") {
        merged = deepmerge(merged, parsed, { arrayMerge: (_, src) => src });
      }
    } catch {
      // Skip missing or invalid files silently
    }
  }

  return merged;
}

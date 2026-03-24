import { readFile, readdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import type { ChameleonRoute } from "../schema/types.js";
import { inferFieldsFromJson } from "./postman.js";

/**
 * Loads static JSON files and returns:
 * 1. ChameleonRoute[] — one route per file (path derived from filename)
 * 2. StaticDataStore entries — raw JSON for overlay use
 */
export async function parseStaticJson(
  fileOrDir: string,
): Promise<{ routes: ChameleonRoute[]; staticData: Record<string, unknown> }> {
  const routes: ChameleonRoute[] = [];
  const staticData: Record<string, unknown> = {};

  let files: string[];
  try {
    const entries = await readdir(fileOrDir, { withFileTypes: true });
    files = entries
      .filter((e) => e.isFile() && extname(e.name) === ".json")
      .map((e) => join(fileOrDir, e.name));
  } catch {
    files = [fileOrDir];
  }

  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const parsed = JSON.parse(content) as unknown;
      staticData[file] = parsed;

      // Derive a URL path from the filename, e.g. "users.json" → "/users"
      const name = basename(file, ".json");
      const path = `/${name.replace(/_/g, "-")}`;

      routes.push({
        source: "static",
        method: "GET",
        path,
        responses: [
          {
            statusCode: 200,
            contentType: "application/json",
            fields: inferFieldsFromJson(parsed, "$"),
          },
        ],
      });
    } catch {
      // Skip invalid files
    }
  }

  return { routes, staticData };
}

import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import type { ChameleonRoute, HttpMethod, SchemaField } from "../schema/types.js";
import { inferFieldsFromJson } from "./postman.js";

interface PactFile {
  consumer?: { name: string };
  provider?: { name: string };
  interactions?: PactInteraction[];
}

interface PactInteraction {
  description?: string;
  request?: {
    method?: string;
    path?: string;
    query?: string;
  };
  response?: {
    status?: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

export async function parsePact(fileOrDir: string): Promise<ChameleonRoute[]> {
  const routes: ChameleonRoute[] = [];

  // Support both single file and directory of Pact JSON files
  let files: string[];
  try {
    const entries = await readdir(fileOrDir, { withFileTypes: true });
    files = entries
      .filter((e) => e.isFile() && extname(e.name) === ".json")
      .map((e) => join(fileOrDir, e.name));
  } catch {
    // Not a directory — treat as single file
    files = [fileOrDir];
  }

  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const pact = JSON.parse(content) as PactFile;
      for (const interaction of pact.interactions ?? []) {
        const route = interactionToRoute(interaction);
        if (route) routes.push(route);
      }
    } catch {
      // Skip invalid files
    }
  }

  return routes;
}

function interactionToRoute(interaction: PactInteraction): ChameleonRoute | null {
  const req = interaction.request;
  if (!req?.path) return null;

  const method = (req.method ?? "GET").toUpperCase() as HttpMethod;
  const statusCode = interaction.response?.status ?? 200;
  const body = interaction.response?.body;

  let fields: SchemaField[] = [];
  if (body !== undefined) {
    fields = inferFieldsFromJson(body, "$");
  }

  return {
    source: "pact",
    method,
    path: req.path,
    responses: [{ statusCode, contentType: "application/json", fields }],
  };
}

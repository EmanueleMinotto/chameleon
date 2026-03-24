import { readFile } from "node:fs/promises";
import type { ChameleonRoute, HttpMethod, SchemaField } from "../schema/types.js";

interface PostmanCollection {
  info: { name: string; schema: string };
  item: PostmanItem[];
}

interface PostmanItem {
  name?: string;
  request?: PostmanRequest;
  response?: PostmanResponse[];
  item?: PostmanItem[];
}

interface PostmanRequest {
  method?: string;
  url?: string | { raw?: string; path?: string[] };
  body?: { mode?: string; raw?: string };
}

interface PostmanResponse {
  name?: string;
  status?: string;
  code?: number;
  header?: Array<{ key: string; value: string }>;
  body?: string;
}

export async function parsePostman(filePath: string): Promise<ChameleonRoute[]> {
  const content = await readFile(filePath, "utf-8");
  const collection = JSON.parse(content) as PostmanCollection;
  const routes: ChameleonRoute[] = [];

  collectItems(collection.item ?? [], routes);
  return routes;
}

function collectItems(items: PostmanItem[], routes: ChameleonRoute[]): void {
  for (const item of items) {
    if (item.item) {
      collectItems(item.item, routes);
      continue;
    }

    if (!item.request) continue;

    const method = (item.request.method ?? "GET").toUpperCase() as HttpMethod;
    const path = extractPath(item.request.url);
    if (!path) continue;

    const responses = (item.response ?? []).map((r) => parsePostmanResponse(r)).filter(Boolean);

    if (responses.length === 0) {
      responses.push({ statusCode: 200, contentType: "application/json", fields: [] });
    }

    routes.push({
      source: "postman",
      method,
      path,
      responses: responses as ChameleonRoute["responses"],
    });
  }
}

function extractPath(url: PostmanRequest["url"]): string | null {
  if (!url) return null;

  const raw = typeof url === "string" ? url : url.raw ?? "";
  if (!raw) return null;

  // Strip protocol + host, keep path
  try {
    const u = new URL(raw.startsWith("http") ? raw : `http://example.com${raw}`);
    return u.pathname || "/";
  } catch {
    // Fallback: take everything after the first /
    const match = raw.match(/\/.*/);
    return match?.[0] ?? "/";
  }
}

function parsePostmanResponse(
  response: PostmanResponse,
): ChameleonRoute["responses"][number] | null {
  const statusCode = response.code ?? 200;
  const contentType =
    response.header?.find((h) => h.key.toLowerCase() === "content-type")?.value ??
    "application/json";

  if (!contentType.includes("json")) return null;

  let fields: SchemaField[] = [];

  if (response.body) {
    try {
      const parsed = JSON.parse(response.body) as unknown;
      fields = inferFieldsFromJson(parsed, "$");
    } catch {
      // ignore parse errors
    }
  }

  return { statusCode, contentType: "application/json", fields };
}

export function inferFieldsFromJson(value: unknown, path: string): SchemaField[] {
  const name = path.split(".").pop() ?? path;

  if (value === null) {
    return [{ path, type: "null", name, required: false }];
  }

  if (Array.isArray(value)) {
    const item = value[0];
    const itemFields = item !== undefined ? inferFieldsFromJson(item, `${path}[]`) : [];
    return [
      {
        path,
        type: "array",
        name,
        required: false,
        items: itemFields[0],
        example: value,
      },
    ];
  }

  if (typeof value === "object") {
    const children: SchemaField[] = [];
    for (const [key, val] of Object.entries(value)) {
      children.push(...inferFieldsFromJson(val, `${path}.${key}`));
    }
    return [{ path, type: "object", name, required: false, properties: children }, ...children];
  }

  return [
    {
      path,
      type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string",
      name,
      required: false,
      example: value,
    },
  ];
}

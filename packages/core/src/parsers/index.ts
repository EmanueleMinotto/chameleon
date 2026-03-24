import type { ChameleonRoute } from "../schema/types.js";
import type { ChameleonConfig } from "../config/schema.js";
import { parseOpenAPI } from "./openapi.js";
import { parseGraphQL } from "./graphql.js";
import { parsePostman } from "./postman.js";
import { parsePact } from "./pact.js";
import { parseStaticJson } from "./static-json.js";

export interface ParseResult {
  routes: ChameleonRoute[];
  staticData: Record<string, unknown>;
}

/**
 * Parses all schema sources defined in config and returns
 * a unified list of ChameleonRoute[] plus the static data store.
 */
export async function parseAll(schemas: ChameleonConfig["schemas"]): Promise<ParseResult> {
  const routes: ChameleonRoute[] = [];
  const staticData: Record<string, unknown> = {};

  const tasks: Array<() => Promise<void>> = [];

  const add = (
    paths: string | string[] | undefined,
    fn: (p: string) => Promise<ChameleonRoute[]>,
  ) => {
    if (!paths) return;
    const list = Array.isArray(paths) ? paths : [paths];
    for (const p of list) {
      tasks.push(async () => {
        const result = await fn(p);
        routes.push(...result);
      });
    }
  };

  add(schemas.openapi, parseOpenAPI);
  add(schemas.graphql, parseGraphQL);
  add(schemas.postman, parsePostman);
  add(schemas.pact, parsePact);

  if (schemas.static) {
    const staticPaths = Array.isArray(schemas.static) ? schemas.static : [schemas.static];
    for (const p of staticPaths) {
      tasks.push(async () => {
        const result = await parseStaticJson(p);
        routes.push(...result.routes);
        Object.assign(staticData, result.staticData);
      });
    }
  }

  const results = await Promise.allSettled(tasks.map((t) => t()));
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[chameleon] Parser error:", result.reason);
    }
  }

  return { routes, staticData };
}

export { parseOpenAPI, parseGraphQL, parsePostman, parsePact, parseStaticJson };

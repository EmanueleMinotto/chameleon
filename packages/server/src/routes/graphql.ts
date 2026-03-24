import type { Context } from "hono";
import { buildSchema, type GraphQLSchema } from "graphql";
import { readFile } from "node:fs/promises";

import type { ChameleonRoute, AnnotationMap, ChameleonConfig } from "@chameleon/core";
import { generateResponse } from "@chameleon/core";

export interface GraphQLHandlerOptions {
  routes: ChameleonRoute[];
  annotations: AnnotationMap;
  staticData: Record<string, unknown>;
  config: Pick<ChameleonConfig, "overlays" | "fakerSeed">;
  schemaPath?: string;
}

let _cachedSchema: GraphQLSchema | null = null;

export async function loadGraphQLSchema(schemaPath: string): Promise<void> {
  const sdl = await readFile(schemaPath, "utf-8");
  _cachedSchema = buildSchema(sdl);
}

/** Returns the loaded schema, if any. */
export function getLoadedSchema(): GraphQLSchema | null {
  return _cachedSchema;
}

/**
 * Handles GraphQL requests (POST /graphql) by:
 * 1. Parsing the operation name from the request body
 * 2. Finding the matching ChameleonRoute
 * 3. Generating fake data for the requested fields
 */
export async function handleGraphQLRequest(
  c: Context,
  options: GraphQLHandlerOptions,
): Promise<Response> {
  const { routes, annotations, staticData, config } = options;

  let body: { query?: string; operationName?: string; variables?: unknown };
  try {
    body = await c.req.json<typeof body>();
  } catch {
    return c.json({ errors: [{ message: "Invalid JSON body" }] }, 400);
  }

  if (!body.query) {
    return c.json({ errors: [{ message: "Missing query" }] }, 400);
  }

  // Find matching GraphQL routes
  const graphqlRoutes = routes.filter((r) => r.source === "graphql");

  if (graphqlRoutes.length === 0) {
    return c.json({ errors: [{ message: "No GraphQL schema loaded" }] }, 404);
  }

  // Use the operation name to find the right route
  const operationName = body.operationName;
  const matchedRoute = operationName
    ? graphqlRoutes.find((r) => r.graphqlName === operationName)
    : graphqlRoutes[0];

  if (!matchedRoute) {
    return c.json({ errors: [{ message: `Operation "${operationName}" not found` }] }, 404);
  }

  try {
    const data = await generateResponse({
      route: matchedRoute,
      annotations,
      staticData,
      config,
    });

    const operationKey = matchedRoute.graphqlName ?? "data";
    return c.json({ data: { [operationKey]: data } });
  } catch (err) {
    return c.json({ errors: [{ message: String(err) }] }, 500);
  }
}

import type { Context } from "hono";
import type {
  ChameleonRoute,
  AnnotationMap,
  ChameleonConfig,
} from "@chameleon/core";
import { generateResponse } from "@chameleon/core";

export interface RestHandlerOptions {
  routes: ChameleonRoute[];
  annotations: AnnotationMap;
  staticData: Record<string, unknown>;
  config: Pick<ChameleonConfig, "overlays" | "fakerSeed">;
}

/**
 * Matches an incoming request to a ChameleonRoute and generates a fake response.
 */
export async function handleRestRequest(
  c: Context,
  options: RestHandlerOptions,
): Promise<Response> {
  const { routes, annotations, staticData, config } = options;
  const method = c.req.method.toUpperCase();
  const path = c.req.path;

  const route = matchRoute(routes, method, path);

  if (!route) {
    return c.json({ error: "No mock defined for this route" }, 404);
  }

  try {
    const body = await generateResponse({
      route,
      annotations,
      staticData,
      config,
      requestPath: path,
      requestMethod: method,
    });

    const response = route.responses.find((r) => r.statusCode >= 200 && r.statusCode < 300)
      ?? route.responses[0];
    const statusCode = response?.statusCode ?? 200;

    return c.json(body, statusCode as 200);
  } catch (err) {
    return c.json({ error: "Generation failed", detail: String(err) }, 500);
  }
}

/**
 * Matches a method + path against the list of ChameleonRoutes.
 * Supports OpenAPI-style path templates: /pets/{id}
 */
export function matchRoute(
  routes: ChameleonRoute[],
  method: string,
  path: string,
): ChameleonRoute | undefined {
  // Exact match first
  const exact = routes.find(
    (r) => r.method === method && r.path === path,
  );
  if (exact) return exact;

  // Template match: /pets/{id} matches /pets/123
  return routes.find((r) => {
    if (r.method !== method) return false;
    return pathMatchesTemplate(r.path, path);
  });
}

function pathMatchesTemplate(template: string, actual: string): boolean {
  const pattern = template
    .replace(/\{[^}]+\}/g, "[^/]+")
    .replace(/\*/g, ".*");
  return new RegExp(`^${pattern}$`).test(actual);
}

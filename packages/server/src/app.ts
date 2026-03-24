import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { randomUUID } from "node:crypto";
import type { ChameleonRoute, AnnotationMap, Manifest, ChameleonConfig } from "@chameleon/core";
import { configureFaker, warmStaticCache, loadGeneratorsBundle } from "@chameleon/core";
import { modeSwitchMiddleware } from "./middleware/mode-switch.js";
import { handleRestRequest } from "./routes/rest.js";
import { handleGraphQLRequest } from "./routes/graphql.js";
import { handleHoppscotchPage, handleHoppscotchCollection } from "./routes/hoppscotch.js";

export interface AppOptions {
  routes: ChameleonRoute[];
  annotations: AnnotationMap;
  staticData: Record<string, unknown>;
  config: ChameleonConfig;
}

/**
 * Creates a Hono application from the parsed schema data.
 * Used by both the local CLI server and the Vercel adapter.
 */
export function createApp(options: AppOptions): Hono {
  const { routes, annotations, staticData, config } = options;
  const instanceId = randomUUID();

  configureFaker(config.fakerSeed);
  warmStaticCache(staticData);

  const app = new Hono();

  // ── Global middleware ──────────────────────────────────────────────────────
  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: Array.isArray(config.server.corsOrigins)
        ? config.server.corsOrigins
        : config.server.corsOrigins,
    }),
  );

  // ── Mode switch (proxy / federation) ──────────────────────────────────────
  app.use(
    "*",
    modeSwitchMiddleware({
      proxy: config.proxy,
      federation: config.federation,
      instanceId,
    }),
  );

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/_chameleon/health", (c) => c.json({ status: "ok", instanceId }));

  // ── Hoppscotch explorer ───────────────────────────────────────────────────
  if (config.hoppscotch) {
    const { path: hoppPath, title } = config.hoppscotch;
    app.get(hoppPath, (c) => handleHoppscotchPage(c, routes, title, hoppPath));
    app.get(`${hoppPath}/collection.json`, (c) => {
      const baseUrl = new URL(c.req.url).origin;
      return handleHoppscotchCollection(c, routes, title, baseUrl);
    });
  }

  // ── GraphQL endpoint ──────────────────────────────────────────────────────
  const hasGraphQL = routes.some((r) => r.source === "graphql");
  if (hasGraphQL) {
    app.post("/graphql", async (c) =>
      handleGraphQLRequest(c, { routes, annotations, staticData, config }),
    );
    // Allow GET for GraphQL introspection tools
    app.get("/graphql", async (c) =>
      handleGraphQLRequest(c, { routes, annotations, staticData, config }),
    );
  }

  // ── REST catch-all ─────────────────────────────────────────────────────────
  app.all("*", async (c) => handleRestRequest(c, { routes, annotations, staticData, config }));

  return app;
}

/**
 * Creates an app from a pre-built Vercel manifest.
 */
export async function createAppFromManifest(manifest: Manifest): Promise<Hono> {
  if (manifest.generatorsBundle) {
    await loadGeneratorsBundle(manifest.generatorsBundle);
  }

  warmStaticCache(manifest.staticData);

  return createApp({
    routes: manifest.routes,
    annotations: manifest.annotations,
    staticData: manifest.staticData,
    config: {
      schemas: {},
      annotations: [],
      server: { port: 3000, host: "0.0.0.0", corsOrigins: "*" },
      fakerSeed: manifest.config.fakerSeed,
      proxy: manifest.config.proxy ?? undefined,
      federation: manifest.config.federation.map((f) => ({ ...f, passHeaders: true })),
      overlays: manifest.config.overlays,
      generatorsDir: "./generators",
      hoppscotch: manifest.config.hoppscotch,
    },
  });
}

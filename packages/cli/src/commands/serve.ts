import { serve } from "@hono/node-server";
import { consola } from "consola";
import chokidar from "chokidar";
import type { ChameleonConfig } from "@chameleon/core";
import { loadConfig, parseAll, loadAnnotations, configureFaker } from "@chameleon/core";
import { createApp } from "@chameleon/server";

interface ServeOptions {
  port?: string;
  config?: string;
  watch?: boolean;
  seed?: string;
  verbose?: boolean;
}

export async function runServe(options: ServeOptions): Promise<void> {
  const config = await loadConfig(options.config, {
    ...(options.port
      ? ({ server: { port: Number(options.port) } } as Partial<ChameleonConfig>)
      : {}),
    ...(options.seed ? { fakerSeed: Number(options.seed) } : {}),
  });

  consola.start("Loading schemas and annotations...");
  const { routes, staticData } = await parseAll(config.schemas);
  const annotations = await loadAnnotations(config.annotations);
  configureFaker(config.fakerSeed);

  consola.success(`Loaded ${routes.length} routes`);

  let app = createApp({ routes, annotations, staticData, config });

  const port = config.server.port;
  const server = serve({ fetch: app.fetch, port }, () => {
    consola.box(`Chameleon running at http://localhost:${port}`);
    if (config.proxy) {
      consola.info(
        `Proxy mode: add "${config.proxy.modeHeader}: ${config.proxy.proxyValue}" header to forward to ${config.proxy.upstream}`,
      );
    }
  });

  if (options.watch) {
    consola.info("Watching for schema and annotation changes...");

    const watchPaths = [
      ...getSchemaFiles(config.schemas),
      ...(Array.isArray(config.annotations) ? config.annotations : [config.annotations]),
      config.generatorsDir,
    ].filter(Boolean);

    const watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      persistent: true,
    });

    let reloading = false;
    const reload = async () => {
      if (reloading) return;
      reloading = true;
      try {
        consola.info("Change detected, reloading...");
        const newRoutes = (await parseAll(config.schemas)).routes;
        const newAnnotations = await loadAnnotations(config.annotations);
        app = createApp({ routes: newRoutes, annotations: newAnnotations, staticData, config });
        consola.success("Reloaded");
      } catch (err) {
        consola.error("Reload failed:", err);
      } finally {
        reloading = false;
      }
    };

    watcher.on("change", reload);
    watcher.on("add", reload);
  }

  process.on("SIGINT", () => {
    consola.info("Shutting down...");
    server.close();
    process.exit(0);
  });
}

function getSchemaFiles(schemas: ChameleonConfig["schemas"]): string[] {
  const files: string[] = [];
  for (const value of Object.values(schemas)) {
    if (!value) continue;
    if (Array.isArray(value)) files.push(...value);
    else files.push(value);
  }
  return files;
}

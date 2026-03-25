import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, extname, resolve, relative } from "node:path";
import { consola } from "consola";
import { build as esbuild } from "esbuild";
import type { Manifest } from "@chameleon/core";
import { loadConfig, parseAll, loadAnnotations } from "@chameleon/core";

interface BuildOptions {
  config?: string;
  output?: string;
  noGenerators?: boolean;
}

export async function runBuild(options: BuildOptions): Promise<void> {
  const outputDir = options.output ?? ".chameleon";
  const config = await loadConfig(options.config);

  consola.start("Building Chameleon manifest for deployment...");

  // 1. Parse schemas
  consola.info("Parsing schemas...");
  const { routes, staticData } = await parseAll(config.schemas);
  consola.success(`Parsed ${routes.length} routes`);

  // 2. Load annotations
  consola.info("Loading annotations...");
  const annotations = await loadAnnotations(config.annotations);

  // 3. Bundle custom generators
  let generatorsBundle: string | undefined;
  if (!options.noGenerators) {
    generatorsBundle = await bundleGenerators(config.generatorsDir);
    if (generatorsBundle) {
      consola.success("Bundled custom generators");
    }
  }

  // 4. Build manifest
  const manifest: Manifest = {
    routes,
    annotations,
    staticData,
    generatorsBundle,
    config: {
      fakerSeed: config.fakerSeed,
      proxy: config.proxy
        ? {
            upstream: config.proxy.upstream,
            modeHeader: config.proxy.modeHeader ?? "X-Chameleon-Mode",
            proxyValue: config.proxy.proxyValue ?? "proxy",
          }
        : null,
      federation: config.federation.map((f) => ({ match: f.match, upstream: f.upstream })),
      overlays: config.overlays.map((o) => ({
        path: o.path,
        method: o.method,
        file: o.file,
        strategy: o.strategy,
      })),
      explorer: config.explorer,
    },
  };

  // 5. Write manifest
  await mkdir(outputDir, { recursive: true });
  const manifestPath = join(outputDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  consola.success(`Manifest written to ${manifestPath}`);
  consola.box(`Build complete! Deploy with: vercel deploy`);
}

async function bundleGenerators(generatorsDir: string): Promise<string | undefined> {
  let entries: string[];
  try {
    const files = await readdir(generatorsDir, { withFileTypes: true });
    entries = files
      .filter((f) => f.isFile() && (extname(f.name) === ".ts" || extname(f.name) === ".js"))
      .map((f) => resolve(join(generatorsDir, f.name)));
  } catch {
    return undefined; // Directory doesn't exist or is empty
  }

  if (entries.length === 0) return undefined;

  // Build a CJS module that exports an object keyed by relative file path.
  // Each value is the default export of the generator file.
  // Using CJS so the bundle can be evaluated with `new Function` at runtime
  // without requiring dynamic ESM import() support.
  const cwd = process.cwd();
  const relPaths = entries.map((e) => relative(cwd, e).replace(/\\/g, "/"));
  const requireLines = entries
    .map((abs, i) => `  ${JSON.stringify(relPaths[i])}: require(${JSON.stringify(abs)}).default`)
    .join(",\n");
  const virtualCode = `module.exports = {\n${requireLines}\n};`;

  try {
    const result = await esbuild({
      stdin: { contents: virtualCode, resolveDir: cwd, loader: "js" },
      bundle: true,
      format: "cjs",
      platform: "node",
      write: false,
      minify: false,
    });

    const code = result.outputFiles.map((f) => f.text).join("\n");
    return Buffer.from(code).toString("base64");
  } catch (err) {
    consola.warn(`Failed to bundle generators: ${String(err)}`);
    return undefined;
  }
}

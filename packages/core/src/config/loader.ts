import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chameleonConfigSchema, type ChameleonConfig } from "./schema.js";

/**
 * Resolves and validates the Chameleon configuration.
 * Priority (highest first): CLI flags → env vars → config file → defaults.
 */
export async function loadConfig(
  configPath?: string,
  cliOverrides: Partial<ChameleonConfig> = {},
): Promise<ChameleonConfig> {
  const filePath = resolve(configPath ?? findDefaultConfigPath());
  const fileConfig = await loadConfigFile(filePath);
  const envConfig = loadEnvConfig();

  const merged = deepMergeConfigs(fileConfig, envConfig as Partial<ChameleonConfig>, cliOverrides);
  return chameleonConfigSchema.parse(merged);
}

function findDefaultConfigPath(): string {
  const candidates = [
    "chameleon/chameleon.config.ts",
    "chameleon/chameleon.config.js",
    "chameleon.config.ts",
    "chameleon.config.js",
    "chameleon.config.yaml",
    "chameleon.config.json",
  ];
  // Return first candidate; actual file existence checked at load time
  return candidates[0]!;
}

async function loadConfigFile(filePath: string): Promise<Partial<ChameleonConfig>> {
  try {
    const ext = extname(filePath);

    if (ext === ".ts" || ext === ".js" || ext === ".mjs") {
      // Dynamic import — tsx registers the TS loader in CLI context
      const mod = await import(filePath);
      return (mod.default ?? mod) as Partial<ChameleonConfig>;
    }

    if (ext === ".yaml" || ext === ".yml") {
      const { parse } = await import("yaml");
      const content = await readFile(filePath, "utf-8");
      return parse(content) as Partial<ChameleonConfig>;
    }

    if (ext === ".json") {
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content) as Partial<ChameleonConfig>;
    }

    return {};
  } catch (err) {
    console.error("[chameleon] Failed to load config file:", filePath, err);
    return {};
  }
}

function loadEnvConfig(): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const server: Record<string, unknown> = {};

  if (process.env["CHAMELEON_PORT"]) {
    server["port"] = Number(process.env["CHAMELEON_PORT"]);
  }
  if (process.env["CHAMELEON_HOST"]) {
    server["host"] = process.env["CHAMELEON_HOST"];
  }
  if (Object.keys(server).length > 0) {
    config["server"] = server;
  }
  if (process.env["CHAMELEON_UPSTREAM_URL"]) {
    config["proxy"] = {
      upstream: process.env["CHAMELEON_UPSTREAM_URL"],
      modeHeader: process.env["CHAMELEON_MODE_HEADER"] ?? "X-Chameleon-Mode",
      proxyValue: "proxy",
    };
  }
  if (process.env["CHAMELEON_FAKER_SEED"]) {
    config["fakerSeed"] = Number(process.env["CHAMELEON_FAKER_SEED"]);
  }

  return config;
}

function deepMergeConfigs(...configs: Partial<ChameleonConfig>[]): Partial<ChameleonConfig> {
  return configs.reduce((acc, cfg) => {
    for (const [key, value] of Object.entries(cfg)) {
      if (value !== undefined) {
        (acc as Record<string, unknown>)[key] = value;
      }
    }
    return acc;
  }, {} as Partial<ChameleonConfig>);
}

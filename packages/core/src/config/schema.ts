import { z } from "zod";

const overlaySchema = z.object({
  path: z.string(),
  method: z.string().toUpperCase(),
  file: z.string(),
  strategy: z.enum(["replace", "deep-merge"]).default("deep-merge"),
});

const federationEntrySchema = z.object({
  match: z.string(),
  upstream: z.string().url(),
  passHeaders: z.boolean().default(true),
  stripPrefix: z.string().optional(),
});

const proxySchema = z.object({
  upstream: z.string().url(),
  modeHeader: z.string().default("X-Chameleon-Mode"),
  proxyValue: z.string().default("proxy"),
});

const serverSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
  host: z.string().default("0.0.0.0"),
  corsOrigins: z.union([z.string(), z.array(z.string())]).default("*"),
});

const schemasSchema = z.object({
  openapi: z.union([z.string(), z.array(z.string())]).optional(),
  graphql: z.union([z.string(), z.array(z.string())]).optional(),
  postman: z.union([z.string(), z.array(z.string())]).optional(),
  pact: z.union([z.string(), z.array(z.string())]).optional(),
  static: z.union([z.string(), z.array(z.string())]).optional(),
});

const explorerSchema = z.object({
  /** URL path where the API explorer is served, e.g. "/_explorer" */
  path: z.string().default("/_explorer"),
  /** Title shown on the landing page and in the exported collections */
  title: z.string().default("Chameleon API Explorer"),
});

export const chameleonConfigSchema = z.object({
  schemas: schemasSchema.default({}),
  /**
   * Path(s) or glob to annotation YAML files.
   * All matched files are deep-merged into a single AnnotationMap.
   */
  annotations: z.union([z.string(), z.array(z.string())]).default("./chameleon.annotations.yml"),
  server: serverSchema.default({}),
  /** Faker seed for reproducible output. null = random each run. */
  fakerSeed: z.number().nullable().default(null),
  proxy: proxySchema.optional(),
  federation: z.array(federationEntrySchema).default([]),
  overlays: z.array(overlaySchema).default([]),
  generatorsDir: z.string().default("./generators"),
  /**
   * When set, serves a landing page and collection exports for Hoppscotch,
   * Postman, and Bruno at the specified path. Omit to disable.
   */
  explorer: explorerSchema.optional(),
});

export type ChameleonConfig = z.infer<typeof chameleonConfigSchema>;

export function defineConfig(config: Partial<ChameleonConfig>): Partial<ChameleonConfig> {
  return config;
}

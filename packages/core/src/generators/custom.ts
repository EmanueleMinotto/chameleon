import { resolve } from "node:path";
import type { CustomAnnotation, GeneratorFn } from "../schema/types.js";

const moduleCache = new Map<string, GeneratorFn>();
let bundledGenerators: Record<string, GeneratorFn> = {};

/**
 * Loads a custom generator from a .ts or .js file.
 * In local dev: uses dynamic import() (tsx must be registered as a loader).
 * In Vercel: uses the pre-bundled generators map.
 */
export async function loadCustomGenerator(annotation: CustomAnnotation): Promise<GeneratorFn> {
  const path = annotation.custom;

  // Check pre-bundled generators (Vercel context)
  const bundledKey = path.replace(/^\.\//, "");
  if (bundledGenerators[bundledKey]) {
    return bundledGenerators[bundledKey]!;
  }

  // Check in-process cache
  if (moduleCache.has(path)) return moduleCache.get(path)!;

  try {
    const absolutePath = resolve(path);
    const mod = (await import(absolutePath)) as { default?: GeneratorFn };
    const fn = mod.default;

    if (typeof fn !== "function") {
      throw new Error(`Custom generator "${path}" must export a default function`);
    }

    moduleCache.set(path, fn);
    return fn;
  } catch (err) {
    throw new Error(`Failed to load custom generator "${path}": ${String(err)}`);
  }
}

/**
 * Registers pre-bundled generator functions (used in Vercel deployment context).
 * Called once at cold-start with the decoded generators bundle.
 */
export function registerBundledGenerators(generators: Record<string, GeneratorFn>): void {
  bundledGenerators = generators;
}

/**
 * Evaluates a base64-encoded CJS bundle and registers all exported generators.
 * The bundle exports an object keyed by relative file path.
 * Used to bootstrap custom generators from a Vercel manifest.
 */
export async function loadGeneratorsBundle(base64Bundle: string): Promise<void> {
  const code = Buffer.from(base64Bundle, "base64").toString("utf-8");
  const fn = new Function("require", "module", "exports", code);
  const mod = { exports: {} as Record<string, GeneratorFn> };
  fn(() => ({}), mod, mod.exports);
  registerBundledGenerators(mod.exports);
}

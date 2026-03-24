import { faker as globalFaker, Faker, en } from "@faker-js/faker";
import type { FakerAnnotation } from "../schema/types.js";

let _faker: Faker = globalFaker;

/** Configure the Faker instance with an optional seed. */
export function configureFaker(seed: number | null): Faker {
  _faker = new Faker({ locale: [en] });
  if (seed !== null) {
    _faker.seed(seed);
  }
  return _faker;
}

export function getFaker(): Faker {
  return _faker;
}

/**
 * Calls a Faker method by dot-notation path, e.g. "internet.email".
 * Supports optional fakerArgs and a transform method.
 */
export function callFaker(annotation: FakerAnnotation, fakerInstance = _faker): unknown {
  const parts = annotation.faker.split(".");
  if (parts.length < 2) {
    throw new Error(
      `Invalid faker path "${annotation.faker}". Expected format: "namespace.method"`,
    );
  }

  // Navigate to the namespace
  let obj: unknown = fakerInstance;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = (obj as Record<string, unknown>)[parts[i]!];
    if (!obj) {
      throw new Error(`Faker namespace "${parts.slice(0, i + 1).join(".")}" not found`);
    }
  }

  const method = parts[parts.length - 1]!;
  const fn = (obj as Record<string, unknown>)[method];
  if (typeof fn !== "function") {
    throw new Error(`"faker.${annotation.faker}" is not a function`);
  }

  const args = annotation.fakerArgs ?? [];
  let result = (fn as (...a: unknown[]) => unknown).apply(obj, args);

  if (annotation.transform && result !== null && result !== undefined) {
    const transformFn = (result as Record<string, unknown>)[annotation.transform];
    if (typeof transformFn === "function") {
      result = (transformFn as () => unknown).call(result);
    }
  }

  return result;
}

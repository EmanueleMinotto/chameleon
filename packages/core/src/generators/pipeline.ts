import deepmerge from "deepmerge";
import type {
  AnnotationMap,
  ChameleonRoute,
  FieldAnnotation,
  GeneratorContext,
  RouteResponse,
  SchemaField,
} from "../schema/types.js";
import type { ChameleonConfig } from "../config/schema.js";
import { resolveAnnotation } from "../annotations/resolver.js";
import { callFaker, getFaker } from "./faker.js";
import { loadCustomGenerator } from "./custom.js";
import { resolveStatic } from "./static.js";

export interface GeneratePipelineOptions {
  route: ChameleonRoute;
  annotations: AnnotationMap;
  staticData: Record<string, unknown>;
  config: Pick<ChameleonConfig, "overlays" | "fakerSeed">;
  requestPath?: string;
  requestMethod?: string;
}

/**
 * Main generation pipeline: takes a matched route and produces a fake response object.
 */
export async function generateResponse(options: GeneratePipelineOptions): Promise<unknown> {
  const { route, annotations, staticData, config, requestPath, requestMethod } = options;

  // Pick the primary response (first 2xx or first available)
  const response =
    route.responses.find((r) => r.statusCode >= 200 && r.statusCode < 300) ??
    route.responses[0];

  if (!response) return {};

  // Build the generated object
  const generated = await buildObject(response, route, annotations, staticData);

  // Apply static JSON overlays from config
  const overlaid = await applyOverlays(
    generated,
    config.overlays ?? [],
    staticData,
    requestPath ?? route.path,
    requestMethod ?? route.method,
  );

  return overlaid;
}

async function buildObject(
  response: RouteResponse,
  route: ChameleonRoute,
  annotations: AnnotationMap,
  staticData: Record<string, unknown>,
): Promise<unknown> {
  // For routes with no fields (e.g. empty schema), return empty object
  if (response.fields.length === 0) return {};

  const rootFields = response.fields.filter((f) => isRootField(f, response.fields));
  const result: Record<string, unknown> = {};

  for (const field of rootFields) {
    // Root-level array or object — generate and return directly
    if (field.path === "$") {
      return generateValue(field, route, annotations, staticData);
    }

    const key = field.path.replace(/^\$\./, "").split(".")[0];
    if (!key || key === "$") continue;

    const value = await generateValue(field, route, annotations, staticData);
    result[key] = value;
  }

  return result;
}

/**
 * A field is "root" if no other field is its direct parent.
 */
function isRootField(field: SchemaField, allFields: SchemaField[]): boolean {
  const parentPath = field.path.split(".").slice(0, -1).join(".");
  if (parentPath === "$" || parentPath === "") return true;
  return !allFields.some((f) => f.path === parentPath && f !== field);
}

async function generateValue(
  field: SchemaField,
  route: ChameleonRoute,
  annotations: AnnotationMap,
  staticData: Record<string, unknown>,
): Promise<unknown> {
  const annotation = resolveAnnotation(field, route, annotations);

  if (field.type === "object" && field.properties) {
    return buildNestedObject(field.properties, route, annotations, staticData);
  }

  if (field.type === "array") {
    return generateArray(field, annotation, route, annotations, staticData);
  }

  if (!annotation) return getDefaultForType(field.type);

  return applyAnnotation(annotation, { faker: getFaker(), schemaField: field }, staticData);
}

async function buildNestedObject(
  properties: SchemaField[],
  route: ChameleonRoute,
  annotations: AnnotationMap,
  staticData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const obj: Record<string, unknown> = {};

  for (const prop of properties) {
    // Only process direct children (one level deep relative to parent)
    const segments = prop.path.replace(/^\$/, "").split(".").filter(Boolean);
    const key = segments[segments.length - 1];
    if (!key) continue;

    // Skip if this is a nested-nested field (it will be handled recursively)
    const value = await generateValue(prop, route, annotations, staticData);
    obj[key] = value;
  }

  return obj;
}

async function generateArray(
  field: SchemaField,
  annotation: FieldAnnotation | null,
  route: ChameleonRoute,
  annotations: AnnotationMap,
  staticData: Record<string, unknown>,
): Promise<unknown[]> {
  const faker = getFaker();
  const arrayAnnotation = annotation as (FieldAnnotation & { arrayLength?: { min: number; max: number } }) | null;
  const min = arrayAnnotation?.arrayLength?.min ?? 1;
  const max = arrayAnnotation?.arrayLength?.max ?? 5;
  const length = faker.number.int({ min, max });

  const items: unknown[] = [];

  for (let i = 0; i < length; i++) {
    if (field.items) {
      const itemValue = await generateValue(field.items, route, annotations, staticData);
      items.push(itemValue);
    } else if (annotation) {
      const value = await applyAnnotation(
        annotation,
        { faker, schemaField: field },
        staticData,
      );
      items.push(value);
    } else {
      items.push(faker.lorem.word());
    }
  }

  return items;
}

async function applyAnnotation(
  annotation: FieldAnnotation,
  ctx: GeneratorContext,
  staticData: Record<string, unknown>,
): Promise<unknown> {
  if ("faker" in annotation) {
    return callFaker(annotation, ctx.faker);
  }

  if ("custom" in annotation) {
    const fn = await loadCustomGenerator(annotation);
    return fn(ctx);
  }

  if ("static" in annotation) {
    return resolveStatic(annotation, staticData);
  }

  if ("oneOf" in annotation) {
    return ctx.faker.helpers.arrayElement(annotation.oneOf);
  }

  return null;
}

async function applyOverlays(
  generated: unknown,
  overlays: ChameleonConfig["overlays"],
  staticData: Record<string, unknown>,
  requestPath: string,
  requestMethod: string,
): Promise<unknown> {
  let result = generated;

  for (const overlay of overlays) {
    const pathMatches = overlay.path === requestPath ||
      matchPathTemplate(overlay.path, requestPath);
    const methodMatches = overlay.method.toUpperCase() === requestMethod.toUpperCase();

    if (!pathMatches || !methodMatches) continue;

    // Load overlay data
    let overlayData: unknown;
    const fromStore = staticData[overlay.file];
    if (fromStore !== undefined) {
      overlayData = fromStore;
    } else {
      try {
        const { readFile } = await import("node:fs/promises");
        const content = await readFile(overlay.file, "utf-8");
        overlayData = JSON.parse(content) as unknown;
      } catch {
        continue;
      }
    }

    if (overlay.strategy === "replace") {
      result = overlayData;
    } else {
      // deep-merge: overlay wins on conflicts
      result = deepmerge(
        result as Record<string, unknown>,
        overlayData as Record<string, unknown>,
        { arrayMerge: (_, src) => src },
      );
    }
  }

  return result;
}

function matchPathTemplate(template: string, actual: string): boolean {
  const pattern = template.replace(/\{[^}]+\}/g, "[^/]+");
  return new RegExp(`^${pattern}$`).test(actual);
}

function getDefaultForType(type: SchemaField["type"]): unknown {
  switch (type) {
    case "string": return "";
    case "number": return 0;
    case "integer": return 0;
    case "boolean": return false;
    case "object": return {};
    case "array": return [];
    case "null": return null;
    default: return null;
  }
}

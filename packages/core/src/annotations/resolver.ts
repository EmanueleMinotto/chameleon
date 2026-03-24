import micromatch from "micromatch";
import type {
  AnnotationMap,
  ChameleonRoute,
  FieldAnnotation,
  SchemaField,
} from "../schema/types.js";
import { inferAnnotation } from "./infer.js";

/**
 * Resolves the best FieldAnnotation for a given schema field,
 * considering: exact path match → inference hints → auto-inference.
 */
export function resolveAnnotation(
  field: SchemaField,
  route: ChameleonRoute,
  annotations: AnnotationMap,
): FieldAnnotation | null {
  // 1. Exact match from path-based annotations
  const fromPath = resolveFromPath(field, route, annotations);
  if (fromPath) return fromPath;

  // 2. GraphQL type annotations
  if (route.source === "graphql" && route.graphqlName) {
    const fromGraphQL = resolveFromGraphQL(field, route.graphqlName, annotations);
    if (fromGraphQL) return fromGraphQL;
  }

  // 3. InferenceHints — wildcard patterns like "*.email"
  const fromHints = resolveFromHints(field.name, annotations.inferenceHints ?? {});
  if (fromHints) return fromHints;

  // 4. Auto-inference from field metadata
  return inferAnnotation(field);
}

function resolveFromPath(
  field: SchemaField,
  route: ChameleonRoute,
  annotations: AnnotationMap,
): FieldAnnotation | null {
  const pathAnnotations = annotations.paths?.[route.path];
  if (!pathAnnotations) return null;

  const methodAnnotations =
    pathAnnotations[route.method.toLowerCase()] ?? pathAnnotations[route.method];
  if (!methodAnnotations?.response) return null;

  // Try exact JSONPath match first
  const exact = methodAnnotations.response[field.path];
  if (exact) return exact;

  // Try field-name-only match (e.g. "email" matches "$.user.email")
  for (const [key, annotation] of Object.entries(methodAnnotations.response)) {
    if (key === field.path) return annotation;
    // Support simple dot-notation patterns
    if (field.path.endsWith(`.${key}`) || field.path.endsWith(`[].${key}`)) {
      return annotation;
    }
  }

  return null;
}

function resolveFromGraphQL(
  field: SchemaField,
  operationName: string,
  annotations: AnnotationMap,
): FieldAnnotation | null {
  const types = annotations.graphql?.types ?? {};

  // Try to match by type name (derived from operation name)
  for (const [typeName, typeAnnotations] of Object.entries(types)) {
    if (
      operationName.toLowerCase().includes(typeName.toLowerCase()) ||
      typeName.toLowerCase().includes(operationName.toLowerCase())
    ) {
      const annotation = typeAnnotations[field.name];
      if (annotation) return annotation;
    }
  }

  return null;
}

function resolveFromHints(
  fieldName: string,
  hints: Record<string, FieldAnnotation>,
): FieldAnnotation | null {
  for (const [pattern, annotation] of Object.entries(hints)) {
    // micromatch supports "*.email", "user.*", etc.
    if (micromatch.isMatch(fieldName, pattern)) {
      return annotation;
    }
  }
  return null;
}

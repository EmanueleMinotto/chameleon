import type { Faker } from "@faker-js/faker";

// ── HTTP primitives ────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

// ── Schema field ───────────────────────────────────────────────────────────────

export type SchemaFieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "unknown";

export interface SchemaField {
  /** JSONPath-style dot path, e.g. "$.user.email" */
  path: string;
  type: SchemaFieldType;
  /** OpenAPI format hint (e.g. "email", "uuid", "date-time") */
  format?: string;
  /** Field name without path prefix */
  name: string;
  /** Whether the field is required */
  required: boolean;
  /** For array types: schema of each item */
  items?: SchemaField;
  /** For object types: nested fields */
  properties?: SchemaField[];
  /** Possible enum values */
  enum?: unknown[];
  /** Example value from the schema */
  example?: unknown;
}

// ── Parsed route ───────────────────────────────────────────────────────────────

export interface RouteResponse {
  statusCode: number;
  contentType: string;
  /** Flat map of JSONPath → SchemaField for response body */
  fields: SchemaField[];
  /** Raw schema reference (for GraphQL types) */
  schemaRef?: string;
}

export interface ChameleonRoute {
  /** Source schema type */
  source: "openapi" | "graphql" | "postman" | "pact" | "static";
  method: HttpMethod;
  /** Path pattern, e.g. "/pets/{id}" */
  path: string;
  responses: RouteResponse[];
  /** For GraphQL: operation type */
  graphqlOperation?: "query" | "mutation" | "subscription";
  /** For GraphQL: operation name */
  graphqlName?: string;
}

// ── Annotations ────────────────────────────────────────────────────────────────

export interface FakerAnnotation {
  /** Faker method path, e.g. "internet.email" */
  faker: string;
  /** Positional args to pass to the faker method */
  fakerArgs?: unknown[];
  /** Call a method on the result, e.g. "toISOString" */
  transform?: string;
}

export interface CustomAnnotation {
  /** Relative path to a .ts file exporting a default GeneratorFn */
  custom: string;
}

export interface StaticAnnotation {
  /** Literal value or path to a JSON file */
  static: unknown;
}

export interface OneOfAnnotation {
  /** Pick randomly from these values */
  oneOf: unknown[];
}

export interface ArrayLengthAnnotation {
  arrayLength: { min: number; max: number };
}

export type FieldAnnotation = (
  | FakerAnnotation
  | CustomAnnotation
  | StaticAnnotation
  | OneOfAnnotation
) &
  Partial<ArrayLengthAnnotation>;

export interface GraphQLTypeAnnotations {
  [fieldName: string]: FieldAnnotation;
}

export interface PathMethodAnnotations {
  response?: Record<string, FieldAnnotation>;
}

export interface AnnotationMap {
  version?: number;
  paths?: Record<string, Record<string, PathMethodAnnotations>>;
  graphql?: {
    types?: Record<string, GraphQLTypeAnnotations>;
  };
  inferenceHints?: Record<string, FieldAnnotation>;
}

// ── Generator context ──────────────────────────────────────────────────────────

export interface GeneratorContext {
  faker: Faker;
  schemaField: SchemaField;
  /** The raw incoming request (available in server context; undefined in test context) */
  request?: Request;
}

export type GeneratorFn = (ctx: GeneratorContext) => unknown;

// ── Static data store ──────────────────────────────────────────────────────────

export type StaticDataStore = Map<string, unknown>;

// ── Manifest (pre-built for Vercel) ───────────────────────────────────────────

export interface Manifest {
  routes: ChameleonRoute[];
  annotations: AnnotationMap;
  /** key: original file path, value: parsed JSON content */
  staticData: Record<string, unknown>;
  /** Base64-encoded ESM bundle of all custom generators */
  generatorsBundle?: string;
  config: {
    fakerSeed: number | null;
    proxy: {
      upstream: string;
      modeHeader: string;
      proxyValue: string;
    } | null;
    federation: Array<{ match: string; upstream: string }>;
    overlays: Array<{
      path: string;
      method: string;
      file: string;
      strategy: "replace" | "deep-merge";
    }>;
    explorer?: {
      path: string;
      title: string;
    };
  };
}

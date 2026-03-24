// Types
export type {
  ChameleonRoute,
  SchemaField,
  SchemaFieldType,
  AnnotationMap,
  FieldAnnotation,
  FakerAnnotation,
  CustomAnnotation,
  StaticAnnotation,
  OneOfAnnotation,
  ArrayLengthAnnotation,
  GeneratorContext,
  GeneratorFn,
  Manifest,
  HttpMethod,
  RouteResponse,
} from "./schema/types.js";

// Config
export { defineConfig, chameleonConfigSchema } from "./config/schema.js";
export type { ChameleonConfig } from "./config/schema.js";
export { loadConfig } from "./config/loader.js";

// Parsers
export { parseAll, parseOpenAPI, parseGraphQL, parsePostman, parsePact, parseStaticJson } from "./parsers/index.js";

// Annotations
export { loadAnnotations } from "./annotations/loader.js";
export { resolveAnnotation } from "./annotations/resolver.js";
export { inferAnnotation } from "./annotations/infer.js";

// Generators
export { configureFaker, getFaker, callFaker } from "./generators/faker.js";
export { loadCustomGenerator, registerBundledGenerators, loadGeneratorsBundle } from "./generators/custom.js";
export { resolveStatic, warmStaticCache } from "./generators/static.js";
export { generateResponse } from "./generators/pipeline.js";

import { describe, it, expect } from "vitest";
import { resolveAnnotation } from "./resolver.js";
import type { AnnotationMap, ChameleonRoute, SchemaField } from "../schema/types.js";

function makeRoute(overrides: Partial<ChameleonRoute> = {}): ChameleonRoute {
  return {
    source: "openapi",
    method: "GET",
    path: "/users/{id}",
    responses: [],
    ...overrides,
  };
}

function makeField(overrides: Partial<SchemaField> = {}): SchemaField {
  return {
    path: "$.email",
    type: "string",
    name: "email",
    required: false,
    ...overrides,
  };
}

describe("resolveAnnotation", () => {
  it("returns exact annotation match from paths", () => {
    const annotations: AnnotationMap = {
      paths: {
        "/users/{id}": {
          get: {
            response: {
              "$.email": { faker: "internet.email" },
            },
          },
        },
      },
    };

    const result = resolveAnnotation(makeField(), makeRoute(), annotations);
    expect(result).toEqual({ faker: "internet.email" });
  });

  it("returns annotation from inferenceHints for field name pattern", () => {
    const annotations: AnnotationMap = {
      inferenceHints: {
        "*.email": { faker: "internet.email" },
      },
    };

    const result = resolveAnnotation(makeField(), makeRoute(), annotations);
    expect(result).toMatchObject({ faker: "internet.email" });
  });

  it("falls back to auto-inference when no annotation exists", () => {
    const result = resolveAnnotation(makeField({ name: "email" }), makeRoute(), {});
    // Should infer from field name "email"
    expect(result).toMatchObject({ faker: "internet.email" });
  });

  it("returns null for unrecognized object type", () => {
    const result = resolveAnnotation(
      makeField({ name: "metadata", type: "object" }),
      makeRoute(),
      {},
    );
    expect(result).toBeNull();
  });

  it("exact path match takes precedence over hints", () => {
    const annotations: AnnotationMap = {
      paths: {
        "/users/{id}": {
          get: {
            response: {
              "$.email": { static: "fixed@example.com" },
            },
          },
        },
      },
      inferenceHints: {
        "*.email": { faker: "internet.email" },
      },
    };

    const result = resolveAnnotation(makeField(), makeRoute(), annotations);
    expect(result).toEqual({ static: "fixed@example.com" });
  });
});

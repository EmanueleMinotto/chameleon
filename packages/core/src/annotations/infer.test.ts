import { describe, it, expect } from "vitest";
import { inferAnnotation } from "./infer.js";
import type { SchemaField } from "../schema/types.js";

function field(overrides: Partial<SchemaField>): SchemaField {
  return {
    path: "$.test",
    type: "string",
    name: "test",
    required: false,
    ...overrides,
  };
}

describe("inferAnnotation", () => {
  it("returns oneOf for enum fields", () => {
    const result = inferAnnotation(field({ enum: ["a", "b", "c"] }));
    expect(result).toEqual({ oneOf: ["a", "b", "c"] });
  });

  it("infers from OpenAPI format: email", () => {
    const result = inferAnnotation(field({ format: "email" }));
    expect(result).toEqual({ faker: "internet.email" });
  });

  it("infers from OpenAPI format: uuid", () => {
    const result = inferAnnotation(field({ format: "uuid" }));
    expect(result).toEqual({ faker: "string.uuid" });
  });

  it("infers from OpenAPI format: date-time", () => {
    const result = inferAnnotation(field({ format: "date-time" }));
    expect(result).toMatchObject({ faker: "date.past", transform: "toISOString" });
  });

  it("infers from field name: email", () => {
    const result = inferAnnotation(field({ name: "email" }));
    expect(result).toMatchObject({ faker: "internet.email" });
  });

  it("infers from field name: phone", () => {
    const result = inferAnnotation(field({ name: "phone_number" }));
    expect(result).toMatchObject({ faker: "phone.number" });
  });

  it("infers from field name: createdAt", () => {
    const result = inferAnnotation(field({ name: "createdAt" }));
    expect(result).toMatchObject({ faker: "date.past" });
  });

  it("infers from field name: fullName", () => {
    const result = inferAnnotation(field({ name: "full_name" }));
    expect(result).toMatchObject({ faker: "person.fullName" });
  });

  it("infers from field name: username", () => {
    const result = inferAnnotation(field({ name: "username" }));
    expect(result).toMatchObject({ faker: "internet.username" });
  });

  it("falls back to lorem.word for unknown string fields", () => {
    const result = inferAnnotation(field({ name: "mystery_field", type: "string" }));
    expect(result).toEqual({ faker: "lorem.word" });
  });

  it("infers integer type", () => {
    const result = inferAnnotation(field({ name: "count", type: "integer" }));
    expect(result).toMatchObject({ faker: "number.int" });
  });

  it("infers number type", () => {
    const result = inferAnnotation(field({ name: "score", type: "number" }));
    expect(result).toMatchObject({ faker: "number.float" });
  });

  it("infers boolean type", () => {
    const result = inferAnnotation(field({ name: "active", type: "boolean" }));
    expect(result).toEqual({ faker: "datatype.boolean" });
  });

  it("returns null for object type", () => {
    const result = inferAnnotation(field({ name: "data", type: "object" }));
    expect(result).toBeNull();
  });

  it("format takes precedence over name", () => {
    // format=uuid should win over name="email"
    const result = inferAnnotation(field({ name: "email", format: "uuid" }));
    expect(result).toMatchObject({ faker: "string.uuid" });
  });
});

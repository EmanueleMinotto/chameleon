import { describe, it, expect } from "vitest";
import { inferFieldsFromJson } from "./postman.js";

describe("inferFieldsFromJson", () => {
  it("infers string field", () => {
    const fields = inferFieldsFromJson("hello", "$.name");
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ path: "$.name", type: "string", name: "name" });
  });

  it("infers number field", () => {
    const fields = inferFieldsFromJson(42, "$.age");
    expect(fields[0]).toMatchObject({ path: "$.age", type: "number" });
  });

  it("infers boolean field", () => {
    const fields = inferFieldsFromJson(true, "$.active");
    expect(fields[0]).toMatchObject({ path: "$.active", type: "boolean" });
  });

  it("infers null field", () => {
    const fields = inferFieldsFromJson(null, "$.deleted");
    expect(fields[0]).toMatchObject({ path: "$.deleted", type: "null" });
  });

  it("infers object fields recursively", () => {
    const fields = inferFieldsFromJson({ id: 1, name: "Alice" }, "$");
    // root + two children
    expect(fields.length).toBeGreaterThanOrEqual(3);
    const paths = fields.map((f) => f.path);
    expect(paths).toContain("$");
    expect(paths).toContain("$.id");
    expect(paths).toContain("$.name");
  });

  it("infers array field", () => {
    const fields = inferFieldsFromJson([{ id: 1 }], "$.items");
    expect(fields[0]).toMatchObject({ path: "$.items", type: "array" });
    expect(fields[0]?.items).toBeDefined();
  });

  it("handles deeply nested objects", () => {
    const fields = inferFieldsFromJson({ user: { address: { city: "Rome" } } }, "$");
    const paths = fields.map((f) => f.path);
    expect(paths).toContain("$.user");
    expect(paths).toContain("$.user.address");
    expect(paths).toContain("$.user.address.city");
  });
});

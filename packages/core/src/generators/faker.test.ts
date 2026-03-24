import { describe, it, expect, beforeEach } from "vitest";
import { configureFaker, callFaker, getFaker } from "./faker.js";

describe("configureFaker", () => {
  it("returns a Faker instance", () => {
    const faker = configureFaker(null);
    expect(faker).toBeDefined();
    expect(typeof faker.internet.email).toBe("function");
  });

  it("produces the same output with a fixed seed", () => {
    configureFaker(42);
    const a = getFaker().internet.email();
    configureFaker(42);
    const b = getFaker().internet.email();
    expect(a).toBe(b);
  });

  it("produces different output without a seed", () => {
    configureFaker(null);
    const results = new Set(Array.from({ length: 10 }, () => getFaker().string.uuid()));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("callFaker", () => {
  beforeEach(() => {
    configureFaker(123);
  });

  it("calls a faker method by dot-path", () => {
    const result = callFaker({ faker: "string.uuid" });
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("calls faker with args", () => {
    const result = callFaker({
      faker: "number.int",
      fakerArgs: [{ min: 5, max: 5 }],
    });
    expect(result).toBe(5);
  });

  it("applies transform to the result", () => {
    const result = callFaker({
      faker: "date.past",
      transform: "toISOString",
    });
    expect(typeof result).toBe("string");
    expect(result as string).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("throws on invalid namespace", () => {
    expect(() => callFaker({ faker: "nonexistent.method" })).toThrow();
  });

  it("throws on invalid path format (no dot)", () => {
    expect(() => callFaker({ faker: "nodot" })).toThrow(
      /Expected format/,
    );
  });
});

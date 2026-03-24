import { defineConfig } from "@chameleon/core";

/**
 * Chameleon Configuration — Petstore Example
 *
 * This file configures the Chameleon mock server.
 * Edit it to point to your own schemas, annotations, and generators.
 *
 * Run locally:  chameleon serve --config chameleon/chameleon.config.ts
 * Deploy:       vercel deploy  (chameleon build runs automatically)
 */
export default defineConfig({
  // ── Schema sources ──────────────────────────────────────────────────────────
  // All enabled schema types are merged into a single route list.
  schemas: {
    openapi: "./chameleon/schemas/petstore.openapi.yaml",
    graphql: "./chameleon/schemas/petstore.graphql",
    postman: "./chameleon/schemas/petstore.postman.json",
    pact: "./chameleon/schemas/petstore.pact.json",
    // static: "./chameleon/data/",  // Uncomment to auto-expose JSON files as GET routes
  },

  // ── Annotations ─────────────────────────────────────────────────────────────
  // Glob pattern: all matching YAML files are deep-merged in alphabetical order.
  // You can also pass an array: ["./chameleon/annotations/pets.annotations.yml", ...]
  annotations: "./chameleon/annotations/**/*.annotations.yml",

  // ── Server ──────────────────────────────────────────────────────────────────
  server: {
    port: 3000,
    host: "0.0.0.0",
    corsOrigins: "*",
  },

  // ── Faker seed ──────────────────────────────────────────────────────────────
  // Set a number for reproducible (deterministic) fake data on every run.
  // Set to null (default) for random data on each request.
  fakerSeed: null,

  // ── Proxy / passthrough ─────────────────────────────────────────────────────
  // When a request carries the header "X-Chameleon-Mode: proxy",
  // Chameleon forwards it to the real Petstore server instead of mocking it.
  proxy: {
    upstream: "https://petstore3.swagger.io/api/v3",
    modeHeader: "X-Chameleon-Mode",
    proxyValue: "proxy",
  },

  // ── Federation ──────────────────────────────────────────────────────────────
  // Delegate specific routes to other Chameleon instances.
  // Useful for composing multiple mock servers.
  // federation: [
  //   { match: "/store/**", upstream: "https://store-mock.vercel.app" },
  // ],

  // ── Static overlays ─────────────────────────────────────────────────────────
  // Deep-merge a static JSON file on top of the generated response.
  // Static fields win; generated data fills in the gaps.
  overlays: [
    {
      path: "/pets/featured",
      method: "GET",
      file: "./chameleon/data/featured-pet.json",
      strategy: "deep-merge",
    },
  ],

  // ── Custom generators directory ──────────────────────────────────────────────
  // .ts files here can be referenced in annotations with "custom: ./chameleon/generators/myFn.ts"
  generatorsDir: "./chameleon/generators",

  // ── Hoppscotch explorer ──────────────────────────────────────────────────────
  // When enabled, serves a Hoppscotch-compatible collection and landing page.
  // - Landing page: <baseUrl>/_hoppscotch
  // - Collection JSON: <baseUrl>/_hoppscotch/collection.json
  // Uncomment to enable:
  // hoppscotch: {
  //   path: "/_hoppscotch",    // URL path for the explorer (default: "/_hoppscotch")
  //   title: "Petstore API",   // Collection title shown in Hoppscotch
  // },
});

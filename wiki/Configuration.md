# Configuration

All configuration lives in `chameleon/chameleon.config.ts`. Use `defineConfig` for full TypeScript type-safety:

```typescript
import { defineConfig } from "@chameleon/core";

export default defineConfig({
  // ...
});
```

---

## Full reference

```typescript
import { defineConfig } from "@chameleon/core";

export default defineConfig({
  // ── Schemas ──────────────────────────────────────────────────────────────
  schemas: {
    openapi: "./chameleon/schemas/api.openapi.yaml", // string | string[]
    graphql: "./chameleon/schemas/schema.graphql", // string | string[]
    postman: "./chameleon/schemas/collection.json", // string | string[]
    pact: "./chameleon/schemas/pacts/", // string | string[] (directory)
    static: "./chameleon/data/", // string | string[] (directory)
  },

  // ── Annotations ───────────────────────────────────────────────────────────
  // Path, glob, or array of paths to annotation YAML files.
  // Default: "./chameleon.annotations.yml"
  annotations: "./chameleon/annotations/**/*.annotations.yml",

  // ── Server ────────────────────────────────────────────────────────────────
  server: {
    port: 3000, // default: 3000
    host: "0.0.0.0",
    corsOrigins: "*", // string | string[] — passed to Hono CORS middleware
  },

  // ── Faker seed ────────────────────────────────────────────────────────────
  // null  = random output on every run (default)
  // number = deterministic output — same seed always produces the same responses
  fakerSeed: null,

  // ── Proxy mode ────────────────────────────────────────────────────────────
  // Optional. When set, requests with the matching header value are forwarded
  // to the upstream server instead of being mocked.
  proxy: {
    upstream: "https://api.example.com",
    modeHeader: "X-Chameleon-Mode", // default: "X-Chameleon-Mode"
    proxyValue: "proxy", // default: "proxy"
  },

  // ── Federation ────────────────────────────────────────────────────────────
  // Optional. Delegate specific route patterns to other Chameleon instances.
  federation: [
    {
      match: "/payments/**",
      upstream: "https://payments-mock.vercel.app",
      passHeaders: true, // default: true — forward original request headers
      stripPrefix: "/payments", // optional — strip this prefix before forwarding
    },
  ],

  // ── Overlays ──────────────────────────────────────────────────────────────
  // Deep-merge or replace specific route responses with static JSON.
  overlays: [
    {
      path: "/users/me",
      method: "GET",
      file: "./chameleon/data/me.json",
      strategy: "deep-merge", // "deep-merge" | "replace"
    },
  ],

  // ── Custom generators directory ───────────────────────────────────────────
  // Directory scanned for .ts generator files referenced in annotations.
  // Default: "./generators"
  generatorsDir: "./chameleon/generators",

  // ── API client export ─────────────────────────────────────────────────────
  // Optional. When set, serves a landing page with collection downloads for
  // Hoppscotch, Postman, and Bruno at the specified path.
  explorer: {
    path: "/_explorer", // default: "/_explorer"
    title: "My API Explorer", // default: "Chameleon API Explorer"
  },
});
```

---

## Schema field details

### `schemas`

| Key       | Accepts              | Description                          |
| --------- | -------------------- | ------------------------------------ |
| `openapi` | `string \| string[]` | OpenAPI 2.0 / 3.x YAML or JSON files |
| `graphql` | `string \| string[]` | GraphQL SDL files                    |
| `postman` | `string \| string[]` | Postman Collection v2.1 JSON files   |
| `pact`    | `string \| string[]` | Pact JSON files or directories       |
| `static`  | `string \| string[]` | Directories of static JSON files     |

### `server`

| Key           | Type                 | Default     | Description                         |
| ------------- | -------------------- | ----------- | ----------------------------------- |
| `port`        | `number`             | `3000`      | TCP port the server listens on      |
| `host`        | `string`             | `"0.0.0.0"` | Bind address                        |
| `corsOrigins` | `string \| string[]` | `"*"`       | `Access-Control-Allow-Origin` value |

### `federation` entries

| Key           | Type      | Default | Description                                             |
| ------------- | --------- | ------- | ------------------------------------------------------- |
| `match`       | `string`  | —       | Glob/minimatch pattern matched against the request path |
| `upstream`    | `string`  | —       | URL of the upstream Chameleon instance                  |
| `passHeaders` | `boolean` | `true`  | Forward original request headers to the upstream        |
| `stripPrefix` | `string`  | —       | Strip this prefix from the path before forwarding       |

### `overlays` entries

| Key        | Type                        | Default        | Description                    |
| ---------- | --------------------------- | -------------- | ------------------------------ |
| `path`     | `string`                    | —              | Exact request path             |
| `method`   | `string`                    | —              | HTTP method (case-insensitive) |
| `file`     | `string`                    | —              | Path to a JSON file            |
| `strategy` | `"deep-merge" \| "replace"` | `"deep-merge"` | How to apply the overlay       |

---

## Environment variables

Environment variables override the corresponding config values at runtime. Useful for deployments where you don't want to change the config file.

| Variable                 | Config equivalent  | Description                                    |
| ------------------------ | ------------------ | ---------------------------------------------- |
| `CHAMELEON_PORT`         | `server.port`      | Server port                                    |
| `CHAMELEON_HOST`         | `server.host`      | Server host                                    |
| `CHAMELEON_UPSTREAM_URL` | `proxy.upstream`   | Proxy upstream URL                             |
| `CHAMELEON_MODE_HEADER`  | `proxy.modeHeader` | Header name for proxy switching                |
| `CHAMELEON_FAKER_SEED`   | `fakerSeed`        | Faker seed (parsed as integer)                 |
| `CHAMELEON_CONFIG`       | —                  | Path to the config file (CLI flag alternative) |

---

## Deterministic responses

Set `fakerSeed` to a fixed number to get the same fake data on every run. This is useful for:

- Snapshot tests that assert on response bodies
- Demos where you want consistent data
- Debugging annotation issues

```typescript
fakerSeed: 42;
```

Set to `null` (the default) to get random data on each request.

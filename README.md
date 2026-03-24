# Chameleon

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/EmanueleMinotto/chameleon)

<img src="chameleon.png" align="right" width="120" />

Open-source mock/faker server — generate realistic API responses from your existing schemas, with one-click deploy to Vercel.

---

## Features

| Feature | Description |
|---|---|
| **Multi-schema support** | OpenAPI v2/v3, GraphQL SDL, Postman Collections, Pact contracts, static JSON |
| **Annotation system** | Separate YAML files map schema fields to specific Faker.js methods or custom TypeScript generators |
| **Auto-inference** | Missing annotations are inferred from field type, format, and name |
| **Static overlays** | Deep-merge static JSON files on top of generated responses |
| **Proxy mode** | One HTTP header switches between mock and a real upstream server |
| **Federation** | Delegate specific routes to other Chameleon instances |
| **Vercel deploy** | One-click deploy — `chameleon build` pre-compiles everything for cold-start efficiency |
| **Hot reload** | `--watch` mode reloads schemas and annotations without restarting the server |

---

## Requirements

- **Node.js** >= 18
- **pnpm** >= 9 — install with `npm install -g pnpm`

## Getting Started

### Use this template

Click **"Use this template"** on GitHub to create your own repository, then:

```bash
# 1. Install dependencies
pnpm install

# 2. Start the mock server (no build step needed — uses tsx directly)
pnpm dev
```

> `pnpm dev` runs `pnpm chameleon serve --config chameleon/chameleon.config.ts --watch`.
> The `pnpm chameleon` script invokes the CLI via `tsx` without requiring a global install or prior build.

Your mock server is now running at **http://localhost:3000**.

Try it:
```bash
# Get a list of fake pets
curl http://localhost:3000/pets

# Get a pet by ID
curl http://localhost:3000/pets/123

# Get the featured pet (static JSON overlay example)
curl http://localhost:3000/pets/featured

# Get store inventory
curl http://localhost:3000/store/inventory

# Forward to the real Petstore instead of mocking (proxy mode)
curl -H "X-Chameleon-Mode: proxy" http://localhost:3000/pets
```

### All CLI commands (within the repo)

```bash
pnpm chameleon serve    # start mock server
pnpm chameleon build    # build Vercel manifest
pnpm chameleon validate chameleon/schemas/petstore.openapi.yaml
pnpm chameleon annotate chameleon/schemas/petstore.openapi.yaml
pnpm chameleon init     # scaffold config in a fresh directory
```

### Install the CLI globally (once published to npm)

```bash
npm install -g @chameleon/cli

chameleon serve --config chameleon/chameleon.config.ts
```

---

## Project Structure

```
chameleon/          ← your working area (edit this)
├── schemas/        ← put your schema files here
│   ├── api.openapi.yaml
│   ├── schema.graphql
│   └── collection.postman.json
├── annotations/    ← annotation YAML files (multi-file, supports glob)
│   ├── users.annotations.yml
│   └── orders.annotations.yml
├── generators/     ← custom TypeScript generator functions
│   └── myField.ts
├── data/           ← static JSON files for overlays
│   └── featured-item.json
└── chameleon.config.ts  ← main configuration

packages/           ← Chameleon source code (do not edit)
api/
└── chameleon.ts    ← Vercel entry point (do not edit)
vercel.json         ← Vercel routing (do not edit)
```

---

## Annotations

The annotation system is **separate from your schemas** — you never modify the original OpenAPI/GraphQL files. Instead, you create YAML files that map schema fields to Faker.js methods, custom functions, or static values.

Multiple annotation files are **deep-merged** in alphabetical order. Use a glob in your config:

```typescript
annotations: "./chameleon/annotations/**/*.annotations.yml"
```

### Annotation syntax

```yaml
version: 1

paths:
  /users/{id}:
    get:
      response:
        # Faker.js method
        "$.email":
          faker: "internet.email"

        # Faker.js with arguments
        "$.age":
          faker: "number.int"
          fakerArgs:
            - min: 18
              max: 90

        # Faker.js with transform (call .method() on the result)
        "$.createdAt":
          faker: "date.past"
          transform: "toISOString"

        # Custom TypeScript generator
        "$.name":
          custom: "./chameleon/generators/myName.ts"

        # Literal static value
        "$.role":
          static: "user"

        # Static JSON file
        "$.address":
          static: "./chameleon/data/address.json"

        # Random from a list
        "$.status":
          oneOf: ["active", "inactive", "pending"]

        # Control array length
        "$.tags":
          arrayLength: { min: 1, max: 5 }

# GraphQL type annotations
graphql:
  types:
    User:
      email:
        faker: "internet.email"

# Global inference overrides
inferenceHints:
  "*.email":  { faker: "internet.email" }
  "*.phone":  { faker: "phone.number" }
```

### Custom generators

Create a `.ts` file in your `generators/` directory:

```typescript
// chameleon/generators/myName.ts
import type { GeneratorContext } from "@chameleon/core";

export default function ({ faker, schemaField }: GeneratorContext): string {
  return `${faker.person.firstName()} ${faker.person.lastName()}`;
}
```

Then reference it in annotations:
```yaml
"$.name":
  custom: "./chameleon/generators/myName.ts"
```

---

## Proxy / Passthrough Mode

Add the `proxy` section to your config to enable passthrough to a real server:

```typescript
proxy: {
  upstream: "https://api.example.com",
  modeHeader: "X-Chameleon-Mode",   // header to check
  proxyValue: "proxy",              // value that activates passthrough
}
```

Then switch modes per-request:
```bash
# Mock response (default)
curl http://localhost:3000/users

# Real server response
curl -H "X-Chameleon-Mode: proxy" http://localhost:3000/users
```

---

## Federation

Delegate specific routes to other Chameleon instances:

```typescript
federation: [
  { match: "/payments/**", upstream: "https://payments-mock.vercel.app" },
  { match: "/users/**",    upstream: "http://localhost:3001" },
]
```

Chameleon handles loop prevention automatically via the `X-Chameleon-Forwarded-By` header.

---

## Vercel Deployment

This repository is pre-configured for Vercel. The `vercel.json` `buildCommand` runs `chameleon build` automatically before deployment.

**One-click deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/EmanueleMinotto/chameleon)

**Manual deploy:**
```bash
pnpm build                 # build all packages
pnpm chameleon build       # compile schemas → .chameleon/manifest.json
vercel deploy
```

The `chameleon build` command:
1. Parses all schema files
2. Merges annotation files
3. Bundles custom generator `.ts` files with esbuild
4. Outputs `.chameleon/manifest.json` — a single self-contained artifact that the Vercel function loads at cold-start

---

## Configuration Reference

```typescript
// chameleon/chameleon.config.ts
import { defineConfig } from "@chameleon/core";

export default defineConfig({
  schemas: {
    openapi:  "./chameleon/schemas/api.openapi.yaml",   // string or string[]
    graphql:  "./chameleon/schemas/schema.graphql",
    postman:  "./chameleon/schemas/collection.json",
    pact:     "./chameleon/schemas/",                   // directory of .json files
    static:   "./chameleon/data/",                      // directory of JSON files
  },
  annotations: "./chameleon/annotations/**/*.annotations.yml",
  server: {
    port: 3000,
    host: "0.0.0.0",
    corsOrigins: "*",
  },
  fakerSeed: null,     // null = random; number = deterministic
  proxy: {
    upstream: "https://api.example.com",
    modeHeader: "X-Chameleon-Mode",
    proxyValue: "proxy",
  },
  federation: [
    { match: "/payments/**", upstream: "https://payments-mock.vercel.app" },
  ],
  overlays: [
    { path: "/users/me", method: "GET", file: "./chameleon/data/me.json", strategy: "deep-merge" },
  ],
  generatorsDir: "./chameleon/generators",
});
```

### Environment variables

| Variable | Description |
|---|---|
| `CHAMELEON_PORT` | Server port (overrides config) |
| `CHAMELEON_HOST` | Server host |
| `CHAMELEON_UPSTREAM_URL` | Proxy upstream URL |
| `CHAMELEON_MODE_HEADER` | Header name for proxy switching |
| `CHAMELEON_FAKER_SEED` | Faker seed |
| `CHAMELEON_CONFIG` | Path to config file |

---

## CLI Reference

```
chameleon serve     Start the mock server
  -p, --port        Port (default: 3000)
  -c, --config      Config file path
  --watch           Hot-reload on file changes
  --seed            Faker seed

chameleon build     Build Vercel manifest (.chameleon/manifest.json)
  -c, --config      Config file path
  -o, --output      Output directory (default: .chameleon)

chameleon validate  Validate a schema file
  --type            Schema type: openapi, graphql, postman, pact

chameleon annotate  Generate starter annotations from a schema
  -o, --output      Output path (use - for stdout)

chameleon init      Scaffold a new Chameleon project
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Emanuele Minotto

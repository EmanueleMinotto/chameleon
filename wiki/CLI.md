# CLI Reference

The Chameleon CLI is available as `@chameleon/cli`. Within the template repository you can invoke it via:

```bash
pnpm chameleon <command> [options]
```

Or, once installed globally (`npm install -g @chameleon/cli`):

```bash
chameleon <command> [options]
```

---

## `chameleon serve`

Start the mock server.

```
chameleon serve [options]

Options:
  -c, --config <path>   Path to config file (default: ./chameleon/chameleon.config.ts)
  -p, --port <number>   Port to listen on (overrides config, default: 3000)
  --watch               Hot-reload on schema, annotation, or config file changes
  --seed <number>       Faker seed for deterministic output
  -h, --help            Show help
```

### Examples

```bash
# Start with default config
pnpm chameleon serve

# Custom config path
pnpm chameleon serve --config ./my-api/chameleon.config.ts

# Watch mode (hot reload)
pnpm chameleon serve --watch

# Fixed port and seed
pnpm chameleon serve --port 8080 --seed 42
```

### Watch mode

In watch mode, Chameleon monitors your schema files, annotation files, generator files, and the config file for changes. When a change is detected, it reloads everything automatically — no server restart needed.

```bash
pnpm chameleon serve --config chameleon/chameleon.config.ts --watch
```

---

## `chameleon build`

Compile schemas, annotations, and generators into a self-contained `.chameleon/manifest.json` for Vercel deployment.

```
chameleon build [options]

Options:
  -c, --config <path>    Path to config file (default: ./chameleon/chameleon.config.ts)
  -o, --output <dir>     Output directory (default: .chameleon)
  -h, --help             Show help
```

### What it produces

`.chameleon/manifest.json` contains:

- All parsed routes from your schemas
- The merged annotation map
- Custom generator files bundled as a single JS string (via esbuild)
- Static overlay data
- A config snapshot

This file is loaded by the Vercel serverless function at cold-start.

### Example

```bash
pnpm chameleon build --config chameleon/chameleon.config.ts
# → .chameleon/manifest.json
```

---

## `chameleon validate`

Validate a schema file. Exits with code 0 on success, 1 on failure.

```
chameleon validate <file> [options]

Arguments:
  file                  Path to the schema file to validate

Options:
  --type <type>         Schema type: openapi, graphql, postman, pact (auto-detected if omitted)
  -h, --help            Show help
```

### Examples

```bash
# Auto-detect type from file extension
pnpm chameleon validate chameleon/schemas/petstore.openapi.yaml

# Explicit type
pnpm chameleon validate chameleon/schemas/collection.json --type postman
```

Useful in CI to catch schema errors before they reach the server:

```yaml
- name: Validate schemas
  run: |
    pnpm chameleon validate chameleon/schemas/api.openapi.yaml
    pnpm chameleon validate chameleon/schemas/schema.graphql
```

---

## `chameleon annotate`

Generate a starter annotation YAML file from a schema. Scans all fields and outputs an annotation skeleton with inferred Faker.js methods.

```
chameleon annotate <file> [options]

Arguments:
  file                  Path to the schema file

Options:
  -o, --output <path>   Output path for the annotation file (default: stdout, use - for stdout)
  --type <type>         Schema type (auto-detected if omitted)
  -h, --help            Show help
```

### Examples

```bash
# Print to stdout
pnpm chameleon annotate chameleon/schemas/api.openapi.yaml

# Write to file
pnpm chameleon annotate chameleon/schemas/api.openapi.yaml \
  --output chameleon/annotations/api.annotations.yml
```

The generated file uses auto-inferred annotations as a starting point. Edit the output to fine-tune field mappings.

---

## `chameleon init`

Scaffold a new Chameleon project in the current directory (or a specified directory).

```
chameleon init [directory] [options]

Arguments:
  directory             Target directory (default: current directory)

Options:
  -h, --help            Show help
```

### What it creates

```
chameleon/
├── schemas/           (empty, ready for your schema files)
├── annotations/       (empty)
├── generators/        (empty)
├── data/              (empty)
└── chameleon.config.ts
```

### Example

```bash
# Scaffold in current directory
chameleon init

# Scaffold in a new directory
chameleon init my-mock-api
cd my-mock-api
pnpm install
pnpm chameleon serve --watch
```

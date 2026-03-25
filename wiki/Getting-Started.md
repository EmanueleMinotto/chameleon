# Getting Started

## Requirements

- **Node.js** >= 24
- **pnpm** >= 9 — install with `npm install -g pnpm`

## Option 1 — Use this template (recommended)

Click **"Use this template"** on GitHub to create your own repository, then clone it and run:

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs `chameleon serve --config chameleon/chameleon.config.ts --watch`. The `pnpm chameleon` script invokes the CLI via `tsx` without requiring a global install or a prior build step.

Your mock server is now running at **http://localhost:3000**.

## Option 2 — Install the CLI globally

Once published to npm:

```bash
npm install -g @chameleon/cli

# Scaffold a new project in an empty directory
chameleon init

# Start the server
chameleon serve --config chameleon/chameleon.config.ts
```

## Try the Petstore example

The template ships with a Petstore example. With the server running:

```bash
# List fake pets
curl http://localhost:3000/pets

# Get a pet by ID
curl http://localhost:3000/pets/42

# Get the featured pet (static JSON overlay)
curl http://localhost:3000/pets/featured

# Get store inventory
curl http://localhost:3000/store/inventory

# Use the real Petstore API instead of mock (proxy mode)
curl -H "X-Chameleon-Mode: proxy" http://localhost:3000/pets
```

## Health check

Every Chameleon instance exposes a health endpoint:

```bash
curl http://localhost:3000/_chameleon/health
# → {"status":"ok","instanceId":"..."}
```

## Hot reload

Pass `--watch` to automatically reload schemas, annotations, and config on file changes — no server restart needed:

```bash
pnpm chameleon serve --config chameleon/chameleon.config.ts --watch
```

## Next steps

- [Project Structure](Project-Structure) — understand the directory layout
- [Schemas](Schemas) — connect your own schema files
- [Annotations](Annotations) — control how fake data is generated
- [Configuration](Configuration) — full config reference

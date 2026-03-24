# Vercel Deployment

Chameleon is pre-configured for Vercel. The entire server — schemas, annotations, and custom generators — is compiled into a single self-contained artifact and loaded by a serverless function at cold-start.

---

## One-click deploy

[![Deploy with Vercel](https://img.shields.io/badge/deploy_on-Vercel-blue.svg)](https://vercel.com/new/clone?repository-url=https://github.com/EmanueleMinotto/chameleon)

Click the button above to clone the repository and deploy it to your Vercel account in one step. Vercel runs `chameleon build` automatically as the build command.

---

## Manual deploy

```bash
# 1. Build all packages
pnpm build

# 2. Compile schemas, annotations, and generators into .chameleon/manifest.json
pnpm chameleon build --config chameleon/chameleon.config.ts

# 3. Deploy
vercel deploy
```

Or, to deploy to production:

```bash
vercel deploy --prod
```

---

## How the build works

`chameleon build` produces `.chameleon/manifest.json` — a single file containing:

1. **Parsed routes** — all routes extracted from your schemas.
2. **Resolved annotations** — the merged annotation map.
3. **Bundled generators** — custom TypeScript generator files, bundled with esbuild into a single JS string.
4. **Static data** — the contents of all static JSON files referenced in overlays.
5. **Config snapshot** — a subset of your config (faker seed, proxy, federation, overlays, hoppscotch settings).

At cold-start, the Vercel function loads this file and initialises the Hono server. No file system access or TypeScript compilation happens at runtime.

---

## Vercel configuration

`vercel.json` is pre-configured and should not be modified:

```json
{
  "buildCommand": "pnpm build && pnpm chameleon build",
  "functions": {
    "api/chameleon.ts": { "memory": 256, "maxDuration": 10 }
  },
  "rewrites": [{ "source": "/(.*)", "destination": "/api/chameleon" }]
}
```

All requests are rewritten to the `api/chameleon.ts` serverless function, which loads the manifest and handles the request.

---

## Environment variables on Vercel

Set these in your Vercel project settings (or via `vercel env add`) to override config values at runtime:

| Variable                 | Description                              |
| ------------------------ | ---------------------------------------- |
| `CHAMELEON_UPSTREAM_URL` | Enable proxy mode pointing to a real API |
| `CHAMELEON_MODE_HEADER`  | Custom header name for proxy switching   |
| `CHAMELEON_FAKER_SEED`   | Fixed seed for deterministic responses   |

---

## Custom domains

After deploying, assign a custom domain in the Vercel dashboard. Your mock API will then be reachable at e.g. `https://api-mock.example.com`.

---

## Redeployment

After changing schemas, annotations, generators, or config, redeploy to rebuild the manifest:

```bash
vercel deploy --prod
```

If you're using Vercel's GitHub integration, every push to `main` triggers a new deployment automatically (the `vercel.json` `buildCommand` runs `chameleon build` as part of the build).

---

## Limitations

- **No `--watch` mode** — hot reload is only available in local dev. On Vercel, you must redeploy to pick up schema changes.
- **Read-only filesystem** — custom generators must be bundled at build time via `chameleon build`. They cannot be loaded dynamically at runtime.
- **No persistent state** — each serverless invocation is stateless. Faker output is random per request unless `fakerSeed` is set.

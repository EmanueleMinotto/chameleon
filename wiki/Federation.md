# Federation

Federation lets you split a mock API across multiple Chameleon instances. Each instance is responsible for a subset of routes — the main instance delegates matching requests to the appropriate upstream instance.

This is useful for:

- **Microservices** — each team runs their own Chameleon instance for their service; a gateway instance fans out requests.
- **Large schemas** — split a huge OpenAPI spec into smaller per-domain configs.
- **Environment mixing** — route some paths to a staging instance, others to a local dev instance.

---

## Configuration

Add the `federation` array to your `chameleon.config.ts`:

```typescript
import { defineConfig } from "@chameleon/core";

export default defineConfig({
  schemas: {
    openapi: "./chameleon/schemas/gateway.openapi.yaml",
  },
  federation: [
    {
      match:    "/payments/**",
      upstream: "https://payments-mock.vercel.app",
    },
    {
      match:    "/users/**",
      upstream: "http://localhost:3001",
    },
    {
      match:       "/legacy/v1/**",
      upstream:    "http://localhost:3002",
      stripPrefix: "/legacy/v1",
    },
  ],
});
```

### Entry options

| Option | Type | Default | Description |
|---|---|---|---|
| `match` | `string` | — | Glob pattern matched against the request path |
| `upstream` | `string` | — | Base URL of the upstream Chameleon instance |
| `passHeaders` | `boolean` | `true` | Forward original request headers to the upstream |
| `stripPrefix` | `string` | — | Strip this prefix from the path before forwarding |

---

## How matching works

Patterns use [minimatch](https://github.com/isaacs/minimatch) glob syntax:

| Pattern | Matches |
|---|---|
| `/payments/**` | Any path starting with `/payments/` |
| `/users/*/orders` | `/users/42/orders`, `/users/alice/orders` |
| `/v2/{api,admin}/**` | Paths starting with `/v2/api/` or `/v2/admin/` |

Rules are evaluated in order — the first matching rule wins. Unmatched requests are handled locally (mocked or proxied).

---

## Prefix stripping

Use `stripPrefix` when the upstream instance uses a different base path:

```typescript
// Incoming:  GET /legacy/v1/users/42
// Forwarded: GET /users/42  →  http://localhost:3002/users/42
{
  match:       "/legacy/v1/**",
  upstream:    "http://localhost:3002",
  stripPrefix: "/legacy/v1",
}
```

---

## Loop prevention

Chameleon automatically prevents forwarding loops. When forwarding a request, it adds the current instance's UUID to the `X-Chameleon-Forwarded-By` header. If an incoming request already carries that header, the instance handles it locally instead of forwarding again.

---

## Example: microservices gateway

Three instances running locally:

```
# Instance 1 — gateway (port 3000)
# Instance 2 — users service (port 3001)
# Instance 3 — orders service (port 3002)
```

Gateway config:

```typescript
// chameleon/chameleon.config.ts (gateway)
export default defineConfig({
  federation: [
    { match: "/users/**",  upstream: "http://localhost:3001" },
    { match: "/orders/**", upstream: "http://localhost:3002" },
  ],
});
```

Users service config:

```typescript
// users/chameleon.config.ts
export default defineConfig({
  schemas: { openapi: "./schemas/users.openapi.yaml" },
  server: { port: 3001 },
});
```

Orders service config:

```typescript
// orders/chameleon.config.ts
export default defineConfig({
  schemas: { openapi: "./schemas/orders.openapi.yaml" },
  server: { port: 3002 },
});
```

With all three running, `GET http://localhost:3000/users/42` is transparently forwarded to the users service.

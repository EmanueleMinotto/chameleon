# API Client Exports

Chameleon can serve a landing page with ready-to-import collections for the most popular API clients. When enabled, it exposes:

- A **landing page** listing all available REST routes with download links.
- A **Hoppscotch collection** (`collection.json`) importable directly from the UI.
- A **Postman collection** (`postman.json`) compatible with Postman v2.1 and Bruno.

---

## Configuration

Add the `explorer` key to your `chameleon.config.ts`:

```typescript
import { defineConfig } from "@chameleon/core";

export default defineConfig({
  schemas: {
    openapi: "./chameleon/schemas/api.openapi.yaml",
  },
  explorer: {
    path: "/_explorer", // default
    title: "My API", // default: "Chameleon API Explorer"
  },
});
```

| Option  | Type     | Default                    | Description                                     |
| ------- | -------- | -------------------------- | ----------------------------------------------- |
| `path`  | `string` | `"/_explorer"`             | URL path where the explorer is served           |
| `title` | `string` | `"Chameleon API Explorer"` | Title shown on the landing page and collections |

Omit the `explorer` key entirely to disable the feature.

---

## Usage

With the server running, open the landing page in your browser:

```
http://localhost:3000/_explorer
```

The page shows download/import buttons for each client and a table of all available REST routes.

### Hoppscotch

Click **"Open in Hoppscotch"** — the collection URL is pre-filled in Hoppscotch's "Import from URL" dialog. Confirm to load all routes as a ready-to-use collection.

Click **"Download collection.json"** to import the file manually via Hoppscotch → Collections → Import.

The collection is also available directly:

```
GET http://localhost:3000/_explorer/collection.json
```

### Postman

Click **"Download postman.json"** to get a Postman Collection v2.1 file. Import it via Postman → Collections → Import.

The collection uses a `{{baseUrl}}` variable pre-set to your server's origin.

```
GET http://localhost:3000/_explorer/postman.json
```

### Bruno

Bruno supports importing Postman Collection v2.1 files natively. Download `postman.json` from the landing page and import it via Bruno → Import Collection → Postman.

---

## Notes

- Only REST routes are included. The `/graphql` endpoint is excluded — use a GraphQL client directly.
- Routes are populated at startup from the parsed schemas.
- The explorer is available in both local dev mode and Vercel deployments (if `explorer` is configured).

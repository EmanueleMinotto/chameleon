# Hoppscotch Explorer

Chameleon includes a built-in API explorer powered by [Hoppscotch](https://hoppscotch.io/). When enabled, it serves:

- A **landing page** listing all available REST routes.
- A **Hoppscotch collection** (`collection.json`) importable into Hoppscotch with one click.

---

## Configuration

Add the `hoppscotch` key to your `chameleon.config.ts`:

```typescript
import { defineConfig } from "@chameleon/core";

export default defineConfig({
  schemas: {
    openapi: "./chameleon/schemas/api.openapi.yaml",
  },
  hoppscotch: {
    path: "/_hoppscotch", // default
    title: "My API Explorer", // default: "Chameleon API Explorer"
  },
});
```

| Option  | Type     | Default                    | Description                                           |
| ------- | -------- | -------------------------- | ----------------------------------------------------- |
| `path`  | `string` | `"/_hoppscotch"`           | URL path where the explorer is served                 |
| `title` | `string` | `"Chameleon API Explorer"` | Title shown on the landing page and in the collection |

Omit the `hoppscotch` key entirely to disable the explorer.

---

## Usage

With the server running, open the explorer in your browser:

```
http://localhost:3000/_hoppscotch
```

The landing page shows:

- A button to open the collection directly in Hoppscotch.
- A button to download `collection.json`.
- A table of all available REST routes (method + path).

### Import into Hoppscotch

Click **"Open in Hoppscotch"** — the collection URL is pre-filled in Hoppscotch's "Import from URL" dialog. Confirm to load all routes as a ready-to-use collection.

Alternatively, click **"Download collection.json"** and import the file manually via Hoppscotch → Collections → Import.

---

## Collection endpoint

The collection JSON is also available directly:

```
GET http://localhost:3000/_hoppscotch/collection.json
```

This is a standard Hoppscotch v1 collection format. You can use it with any tool that supports Hoppscotch collections, or fetch it programmatically to integrate with your own tooling.

---

## Notes

- Only REST routes are included in the collection. The `/graphql` endpoint is excluded (use a GraphQL client like Hoppscotch's GraphQL tab directly).
- Routes are populated at startup from the parsed schemas. The collection reflects whatever schemas are loaded in your config.
- The explorer is available in both local dev mode and Vercel deployments (if `hoppscotch` is configured).

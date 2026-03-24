import { handle } from "hono/vercel";
import { createAppFromManifest } from "@chameleon/server";
import type { Manifest } from "@chameleon/core";

export { handle };
export { createAppFromManifest };

/**
 * Creates a Vercel-compatible request handler from a pre-built Chameleon manifest.
 *
 * Usage in api/chameleon.ts:
 *
 *   import { createVercelHandler } from "@chameleon/vercel";
 *   import manifest from "../.chameleon/manifest.json" assert { type: "json" };
 *
 *   export const config = { runtime: "nodejs18.x" };
 *   export default await createVercelHandler(manifest);
 */
export async function createVercelHandler(manifest: Manifest) {
  const app = await createAppFromManifest(manifest);
  return handle(app);
}

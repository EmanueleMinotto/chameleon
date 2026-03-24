import type { Context } from "hono";
import type { ChameleonRoute } from "@chameleon/core";
import { randomUUID } from "node:crypto";

interface HoppscotchRequest {
  v: string;
  id: string;
  name: string;
  method: string;
  endpoint: string;
  headers: unknown[];
  params: unknown[];
  body: { contentType: null; body: null };
  auth: { authType: "none"; authActive: false };
  requestVariables: unknown[];
}

interface HoppscotchCollection {
  v: number;
  name: string;
  folders: unknown[];
  requests: HoppscotchRequest[];
}

function buildCollection(
  routes: ChameleonRoute[],
  baseUrl: string,
  title: string,
): HoppscotchCollection {
  const restRoutes = routes.filter((r) => r.source !== "graphql");

  const requests: HoppscotchRequest[] = restRoutes.map((route) => ({
    v: "1",
    id: randomUUID(),
    name: `${route.method} ${route.path}`,
    method: route.method,
    endpoint: `${baseUrl}${route.path}`,
    headers: [],
    params: [],
    body: { contentType: null, body: null },
    auth: { authType: "none", authActive: false },
    requestVariables: [],
  }));

  return { v: 1, name: title, folders: [], requests };
}

function buildHtml(title: string, collectionUrl: string, routes: ChameleonRoute[]): string {
  const restRoutes = routes.filter((r) => r.source !== "graphql");
  const rows = restRoutes
    .map(
      (r) =>
        `<tr><td class="method ${r.method.toLowerCase()}">${r.method}</td><td>${r.path}</td></tr>`,
    )
    .join("\n");

  // Hoppscotch supports importing a collection via its "Import from URL" dialog.
  // The link below pre-fills the collection URL so the user only has to confirm.
  const importUrl = `https://hoppscotch.io/#/?url=${encodeURIComponent(collectionUrl)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 2rem; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; font-size: 0.95rem; }
    .card { background: #1e293b; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    a.btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 0.5rem; text-decoration: none; font-weight: 500; font-size: 0.9rem; transition: opacity 0.15s; }
    a.btn:hover { opacity: 0.85; }
    .btn-primary { background: #6366f1; color: #fff; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .url-box { background: #0f172a; border: 1px solid #334155; border-radius: 0.5rem; padding: 0.75rem 1rem; font-family: monospace; font-size: 0.85rem; color: #7dd3fc; word-break: break-all; margin-top: 0.75rem; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; color: #64748b; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 0.5rem; border-bottom: 1px solid #334155; }
    td { padding: 0.6rem 0; border-bottom: 1px solid #1e293b; font-size: 0.9rem; }
    td.method { font-family: monospace; font-weight: 600; width: 80px; }
    .get { color: #34d399; }
    .post { color: #60a5fa; }
    .put { color: #fbbf24; }
    .patch { color: #f97316; }
    .delete { color: #f87171; }
    .head, .options { color: #a78bfa; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p class="subtitle">Powered by Chameleon — import the collection into Hoppscotch to start testing.</p>

    <div class="card">
      <h2>Open in Hoppscotch</h2>
      <div class="actions">
        <a class="btn btn-primary" href="${importUrl}" target="_blank" rel="noopener">Open in Hoppscotch</a>
        <a class="btn btn-secondary" href="collection.json" download="collection.json">Download collection.json</a>
      </div>
      <div class="url-box">Collection URL: ${collectionUrl}</div>
    </div>

    <div class="card">
      <h2>Available routes (${restRoutes.length})</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

export function handleHoppscotchCollection(
  c: Context,
  routes: ChameleonRoute[],
  title: string,
  baseUrl: string,
): Response {
  const collection = buildCollection(routes, baseUrl, title);
  return c.json(collection);
}

export function handleHoppscotchPage(
  c: Context,
  routes: ChameleonRoute[],
  title: string,
  hoppscotchPath: string,
): Response {
  const origin = new URL(c.req.url).origin;
  const collectionUrl = `${origin}${hoppscotchPath}/collection.json`;
  const html = buildHtml(title, collectionUrl, routes);
  return c.html(html);
}

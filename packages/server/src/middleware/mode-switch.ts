import type { Context, Next } from "hono";
import type { ChameleonConfig } from "@chameleon/core";

export interface ModeSwitchOptions {
  proxy?: ChameleonConfig["proxy"];
  federation?: ChameleonConfig["federation"];
  instanceId: string;
}

/**
 * Mode Switch Middleware — the first middleware on every request.
 *
 * Reads X-Chameleon-Mode (or the configured header) and routes accordingly:
 *   - "proxy"   → forward to the configured upstream real server
 *   - absence   → fall through to mock generation
 *
 * Also handles federation: if the request path matches a federation rule,
 * it is forwarded to the peer Chameleon instance.
 */
export function modeSwitchMiddleware(options: ModeSwitchOptions) {
  return async (c: Context, next: Next) => {
    const { proxy, federation = [], instanceId } = options;

    // ── Anti-loop guard ──────────────────────────────────────────────────────
    const forwardedBy = c.req.header("X-Chameleon-Forwarded-By");
    if (forwardedBy === instanceId) {
      // We're receiving our own forwarded request — break the loop, serve mock
      return next();
    }

    // ── Proxy mode ───────────────────────────────────────────────────────────
    if (proxy) {
      const modeHeader = c.req.header(proxy.modeHeader ?? "X-Chameleon-Mode");
      if (modeHeader === (proxy.proxyValue ?? "proxy")) {
        return forwardRequest(c, proxy.upstream);
      }
    }

    // ── Federation routing ───────────────────────────────────────────────────
    for (const rule of federation) {
      if (pathMatchesPattern(c.req.path, rule.match)) {
        const upstream = expandEnvVars(rule.upstream);
        const targetPath = rule.stripPrefix
          ? c.req.path.replace(rule.stripPrefix, "")
          : c.req.path;

        return forwardRequest(c, upstream, targetPath, instanceId);
      }
    }

    return next();
  };
}

async function forwardRequest(
  c: Context,
  upstream: string,
  overridePath?: string,
  instanceId?: string,
): Promise<Response> {
  const url = new URL(overridePath ?? c.req.path, upstream);
  url.search = new URL(c.req.url).search;

  const headers = new Headers(c.req.raw.headers);
  // Remove hop-by-hop headers
  headers.delete("host");
  headers.delete("connection");

  if (instanceId) {
    headers.set("X-Chameleon-Forwarded-By", instanceId);
  }

  try {
    const response = await fetch(url.toString(), {
      method: c.req.method,
      headers,
      body: c.req.method !== "GET" && c.req.method !== "HEAD" ? c.req.raw.body : undefined,
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    return c.json({ error: "Upstream unavailable", detail: String(err) }, 502);
  }
}

function pathMatchesPattern(path: string, pattern: string): boolean {
  // Convert glob-like "/**" to regex
  const regexStr = pattern
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\{[^}]+\}/g, "[^/]+");
  return new RegExp(`^${regexStr}$`).test(path);
}

function expandEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] ?? "");
}

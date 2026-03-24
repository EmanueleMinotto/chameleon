import { consola } from "consola";
import { parseOpenAPI, parseGraphQL, parsePostman, parsePact } from "@chameleon/core";

type SchemaType = "openapi" | "graphql" | "postman" | "pact" | "auto";

interface ValidateOptions {
  type?: SchemaType;
}

export async function runValidate(schemaPath: string, options: ValidateOptions): Promise<void> {
  const type = options.type ?? detectType(schemaPath);
  consola.start(`Validating ${type} schema: ${schemaPath}`);

  try {
    let routes;
    switch (type) {
      case "openapi":
        routes = await parseOpenAPI(schemaPath);
        break;
      case "graphql":
        routes = await parseGraphQL(schemaPath);
        break;
      case "postman":
        routes = await parsePostman(schemaPath);
        break;
      case "pact":
        routes = await parsePact(schemaPath);
        break;
      default:
        routes = await parseOpenAPI(schemaPath);
    }

    consola.success(`Valid! Found ${routes.length} routes:`);
    for (const route of routes) {
      const fields = route.responses[0]?.fields.length ?? 0;
      consola.log(`  ${route.method.padEnd(7)} ${route.path} (${fields} response fields)`);
    }
  } catch (err) {
    consola.error(`Validation failed: ${String(err)}`);
    process.exit(1);
  }
}

function detectType(path: string): SchemaType {
  const lower = path.toLowerCase();
  if (lower.endsWith(".graphql") || lower.endsWith(".gql")) return "graphql";
  if (lower.includes("postman") || lower.includes("collection")) return "postman";
  if (lower.includes("pact")) return "pact";
  return "openapi";
}

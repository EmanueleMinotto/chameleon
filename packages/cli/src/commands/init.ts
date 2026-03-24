import { writeFile, mkdir } from "node:fs/promises";
import { consola } from "consola";

interface InitOptions {
  force?: boolean;
}

const CONFIG_TEMPLATE = `import { defineConfig } from "@chameleon/core";

export default defineConfig({
  schemas: {
    // Add your schema paths here:
    openapi: "./chameleon/schemas/your-api.openapi.yaml",
    // graphql: "./chameleon/schemas/schema.graphql",
    // postman: "./chameleon/schemas/collection.json",
    // pact: "./chameleon/schemas/",
    // static: "./chameleon/data/",
  },

  // Annotation files — one or more YAML files, supports glob
  annotations: "./chameleon/annotations/**/*.annotations.yml",

  server: {
    port: 3000,
  },

  // fakerSeed: 12345, // Uncomment for reproducible responses

  // proxy: {
  //   upstream: "https://your-real-api.example.com",
  //   modeHeader: "X-Chameleon-Mode",
  //   proxyValue: "proxy",
  // },

  // federation: [
  //   { match: "/payments/**", upstream: "https://payments-mock.vercel.app" },
  // ],

  generatorsDir: "./chameleon/generators",
});
`;

const ANNOTATIONS_TEMPLATE = `version: 1

# Annotate your API response fields here.
# Each field can use:
#   faker: "namespace.method"        — call a Faker.js method
#   custom: "./generators/myFn.ts"  — call a custom TypeScript function
#   static: "literal value"         — return a fixed value
#   static: "./data/file.json"      — return content from a JSON file
#   oneOf: [a, b, c]                — pick randomly from a list

paths:
  /example:
    get:
      response:
        "$.id":
          faker: "string.uuid"
        "$.email":
          faker: "internet.email"
        "$.name":
          faker: "person.fullName"
        "$.createdAt":
          faker: "date.past"
          transform: "toISOString"

# GraphQL type annotations
# graphql:
#   types:
#     User:
#       id:
#         faker: "string.uuid"
#       email:
#         faker: "internet.email"

# Global inference overrides (applied when no specific annotation matches)
inferenceHints:
  "*.email":  { faker: "internet.email" }
  "*.phone":  { faker: "phone.number" }
`;

const GENERATOR_EXAMPLE = `import type { GeneratorContext } from "@chameleon/core";

/**
 * Custom generator example.
 * Export a default function that receives a GeneratorContext and returns any value.
 */
export default function example({ faker }: GeneratorContext): string {
  const adjectives = ["Amazing", "Brilliant", "Creative", "Dynamic"];
  return \`\${faker.helpers.arrayElement(adjectives)} \${faker.person.firstName()}\`;
}
`;

export async function runInit(_options: InitOptions): Promise<void> {
  consola.box("Welcome to Chameleon!");

  // Create directory structure
  const dirs = [
    "chameleon/schemas",
    "chameleon/annotations",
    "chameleon/generators",
    "chameleon/data",
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
    consola.success(`Created ${dir}/`);
  }

  // Write config
  await writeFile("chameleon/chameleon.config.ts", CONFIG_TEMPLATE, "utf-8");
  consola.success("Created chameleon/chameleon.config.ts");

  // Write starter annotations
  await writeFile("chameleon/annotations/example.annotations.yml", ANNOTATIONS_TEMPLATE, "utf-8");
  consola.success("Created chameleon/annotations/example.annotations.yml");

  // Write generator example
  await writeFile("chameleon/generators/example.ts", GENERATOR_EXAMPLE, "utf-8");
  consola.success("Created chameleon/generators/example.ts");

  consola.box(
    [
      "Next steps:",
      "",
      "1. Add your schema files to chameleon/schemas/",
      "2. Edit chameleon/chameleon.config.ts",
      "3. Run: chameleon serve --config chameleon/chameleon.config.ts",
      "4. Deploy: vercel deploy",
    ].join("\n"),
  );
}

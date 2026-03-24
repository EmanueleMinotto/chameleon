#!/usr/bin/env node
import { Command } from "commander";
import { runServe } from "./commands/serve.js";
import { runBuild } from "./commands/build.js";
import { runValidate } from "./commands/validate.js";
import { runAnnotate } from "./commands/annotate.js";
import { runInit } from "./commands/init.js";

const program = new Command();

program
  .name("chameleon")
  .description("Open-source mock/faker server — generate realistic API responses from your schemas")
  .version("0.1.0");

program
  .command("serve")
  .description("Start the Chameleon mock server")
  .option("-p, --port <port>", "Port to listen on")
  .option("-c, --config <path>", "Path to chameleon.config.ts")
  .option("--watch", "Watch schemas and annotations for changes and hot-reload")
  .option("--seed <number>", "Faker seed for reproducible output")
  .option("--verbose", "Log generated values for each request")
  .action(runServe);

program
  .command("build")
  .description("Build the Chameleon manifest for Vercel deployment")
  .option("-c, --config <path>", "Path to chameleon.config.ts")
  .option("-o, --output <dir>", "Output directory (default: .chameleon)")
  .option("--no-generators", "Skip bundling custom generators")
  .action(runBuild);

program
  .command("validate <schema>")
  .description("Parse and validate a schema file")
  .option("--type <type>", "Schema type: openapi, graphql, postman, pact")
  .action(runValidate);

program
  .command("annotate <schema>")
  .description("Generate a starter annotations YAML file from a schema")
  .option("-o, --output <path>", "Output path (use - for stdout)")
  .option("--type <type>", "Schema type: openapi, graphql, postman, pact")
  .action(runAnnotate);

program
  .command("init")
  .description("Scaffold a new Chameleon project (creates config, annotations, generators)")
  .option("--force", "Overwrite existing files")
  .action(runInit);

program.parse();

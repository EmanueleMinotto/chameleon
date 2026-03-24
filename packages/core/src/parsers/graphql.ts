import {
  buildSchema,
  type GraphQLSchema,
  type GraphQLField,
  type GraphQLOutputType,
  GraphQLNonNull,
  type GraphQLScalarType,
  isObjectType,
  isListType,
  isNonNullType,
  isScalarType,
  isEnumType,
} from "graphql";
import { readFile } from "node:fs/promises";
import type { ChameleonRoute, SchemaField, SchemaFieldType } from "../schema/types.js";

export async function parseGraphQL(filePath: string): Promise<ChameleonRoute[]> {
  const sdl = await readFile(filePath, "utf-8");
  const schema = buildSchema(sdl);
  const routes: ChameleonRoute[] = [];

  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();

  if (queryType) {
    for (const [name, field] of Object.entries(queryType.getFields())) {
      routes.push(buildGraphQLRoute(name, field, "query", schema));
    }
  }

  if (mutationType) {
    for (const [name, field] of Object.entries(mutationType.getFields())) {
      routes.push(buildGraphQLRoute(name, field, "mutation", schema));
    }
  }

  return routes;
}

function buildGraphQLRoute(
  name: string,
  field: GraphQLField<unknown, unknown>,
  operation: "query" | "mutation",
  _schema: GraphQLSchema,
): ChameleonRoute {
  const fields = graphqlTypeToFields(field.type, "$");

  return {
    source: "graphql",
    method: operation === "query" ? "GET" : "POST",
    path: `/graphql`,
    graphqlOperation: operation,
    graphqlName: name,
    responses: [
      {
        statusCode: 200,
        contentType: "application/json",
        fields,
        schemaRef: name,
      },
    ],
  };
}

function graphqlTypeToFields(type: GraphQLOutputType, basePath: string): SchemaField[] {
  const unwrapped = unwrapType(type);
  const isList = isListWrapped(type);
  const name = basePath.split(".").pop() ?? basePath;

  if (isObjectType(unwrapped)) {
    const fields: SchemaField[] = [];
    for (const [fieldName, field] of Object.entries(unwrapped.getFields())) {
      const subPath = `${basePath}.${fieldName}`;
      fields.push(...graphqlTypeToFields(field.type, subPath));
    }

    const self: SchemaField = {
      path: basePath,
      type: isList ? "array" : "object",
      name,
      required: isNonNull(type),
      properties: fields,
    };
    return [self, ...fields];
  }

  if (isScalarType(unwrapped)) {
    const base: SchemaField = {
      path: basePath,
      type: isList ? "array" : scalarToFieldType(unwrapped),
      name,
      required: isNonNull(type),
      format: scalarToFormat(unwrapped),
    };
    return [base];
  }

  if (isEnumType(unwrapped)) {
    return [
      {
        path: basePath,
        type: "string",
        name,
        required: isNonNull(type),
        enum: unwrapped.getValues().map((v) => v.value),
      },
    ];
  }

  return [{ path: basePath, type: "unknown", name, required: false }];
}

function unwrapType(type: GraphQLOutputType): GraphQLOutputType {
  if (isNonNullType(type)) return unwrapType(type.ofType);
  if (isListType(type)) return unwrapType(type.ofType);
  return type;
}

function isListWrapped(type: GraphQLOutputType): boolean {
  if (isNonNullType(type)) return isListWrapped(type.ofType);
  return isListType(type);
}

function isNonNull(type: GraphQLOutputType): boolean {
  return type instanceof GraphQLNonNull;
}

function scalarToFieldType(scalar: GraphQLScalarType): SchemaFieldType {
  switch (scalar.name) {
    case "Int": return "integer";
    case "Float": return "number";
    case "Boolean": return "boolean";
    case "ID":
    case "String": return "string";
    default: return "string";
  }
}

function scalarToFormat(scalar: GraphQLScalarType): string | undefined {
  switch (scalar.name) {
    case "ID": return "uuid";
    default: return undefined;
  }
}

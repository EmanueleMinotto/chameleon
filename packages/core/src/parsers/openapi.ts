import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPI, OpenAPIV3, OpenAPIV2 } from "openapi-types";
import type { ChameleonRoute, HttpMethod, SchemaField, SchemaFieldType } from "../schema/types.js";

export async function parseOpenAPI(filePath: string): Promise<ChameleonRoute[]> {
  const api = (await SwaggerParser.dereference(filePath)) as OpenAPI.Document;
  const routes: ChameleonRoute[] = [];

  const isV3 = "openapi" in api;

  if (isV3) {
    const v3 = api as OpenAPIV3.Document;
    for (const [path, pathItem] of Object.entries(v3.paths ?? {})) {
      if (!pathItem) continue;
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method.toLowerCase() as keyof OpenAPIV3.PathItemObject] as
          | OpenAPIV3.OperationObject
          | undefined;
        if (!operation) continue;

        routes.push({
          source: "openapi",
          method,
          path,
          responses: extractV3Responses(operation),
        });
      }
    }
  } else {
    const v2 = api as OpenAPIV2.Document;
    for (const [path, pathItem] of Object.entries(v2.paths ?? {})) {
      if (!pathItem) continue;
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method.toLowerCase() as keyof OpenAPIV2.PathItemObject] as
          | OpenAPIV2.OperationObject
          | undefined;
        if (!operation) continue;

        routes.push({
          source: "openapi",
          method,
          path,
          responses: extractV2Responses(operation),
        });
      }
    }
  }

  return routes;
}

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

function extractV3Responses(operation: OpenAPIV3.OperationObject): ChameleonRoute["responses"] {
  const result: ChameleonRoute["responses"] = [];

  for (const [statusCode, responseOrRef] of Object.entries(operation.responses ?? {})) {
    const response = responseOrRef as OpenAPIV3.ResponseObject;
    if (!response?.content) continue;

    const jsonContent = response.content["application/json"];
    if (!jsonContent?.schema) continue;

    const schema = jsonContent.schema as OpenAPIV3.SchemaObject;
    result.push({
      statusCode: statusCode === "default" ? 200 : Number(statusCode),
      contentType: "application/json",
      fields: schemaToFields(schema, "$"),
    });
  }

  if (result.length === 0) {
    result.push({ statusCode: 200, contentType: "application/json", fields: [] });
  }

  return result;
}

function extractV2Responses(operation: OpenAPIV2.OperationObject): ChameleonRoute["responses"] {
  const result: ChameleonRoute["responses"] = [];

  for (const [statusCode, response] of Object.entries(operation.responses ?? {})) {
    const r = response as OpenAPIV2.ResponseObject;
    if (!r?.schema) continue;

    result.push({
      statusCode: statusCode === "default" ? 200 : Number(statusCode),
      contentType: "application/json",
      fields: schemaToFields(r.schema as OpenAPIV3.SchemaObject, "$"),
    });
  }

  if (result.length === 0) {
    result.push({ statusCode: 200, contentType: "application/json", fields: [] });
  }

  return result;
}

export function schemaToFields(
  schema: OpenAPIV3.SchemaObject,
  basePath: string,
  required: string[] = [],
  fieldName?: string,
): SchemaField[] {
  const fields: SchemaField[] = [];
  const name = fieldName ?? basePath.split(".").pop() ?? basePath;

  if (schema.type === "object" || schema.properties) {
    const requiredFields = schema.required ?? [];
    const properties = schema.properties as Record<string, OpenAPIV3.SchemaObject> | undefined;

    if (properties) {
      for (const [propName, propSchema] of Object.entries(properties)) {
        const propPath = `${basePath}.${propName}`;
        const subFields = schemaToFields(
          propSchema,
          propPath,
          requiredFields,
          propName,
        );
        fields.push(...subFields);
      }
    }

    fields.unshift({
      path: basePath,
      type: "object",
      name,
      required: required.includes(name),
      properties: fields.filter((f) => f.path.startsWith(basePath + ".")),
      format: schema.format,
      enum: schema.enum,
      example: schema.example,
    });
  } else if (schema.type === "array" && schema.items) {
    const itemSchema = schema.items as OpenAPIV3.SchemaObject;
    const itemFields = schemaToFields(itemSchema, `${basePath}[]`, [], "item");
    fields.push({
      path: basePath,
      type: "array",
      name,
      required: required.includes(name),
      items: itemFields[0],
      format: schema.format,
      enum: schema.enum,
      example: schema.example,
    });
  } else {
    fields.push({
      path: basePath,
      type: mapType(schema.type),
      name,
      required: required.includes(name),
      format: schema.format,
      enum: schema.enum,
      example: schema.example,
    });
  }

  return fields;
}

function mapType(type: string | string[] | undefined): SchemaFieldType {
  const t = Array.isArray(type) ? type[0] : type;
  switch (t) {
    case "string": return "string";
    case "number": return "number";
    case "integer": return "integer";
    case "boolean": return "boolean";
    case "object": return "object";
    case "array": return "array";
    case "null": return "null";
    default: return "unknown";
  }
}

import type { SchemaField, FieldAnnotation } from "../schema/types.js";

/**
 * Infers a FieldAnnotation from a SchemaField's type, format, name, and enum values.
 * Used as fallback when no explicit annotation is provided.
 */
export function inferAnnotation(field: SchemaField): FieldAnnotation | null {
  // Enum — pick randomly from allowed values
  if (field.enum && field.enum.length > 0) {
    return { oneOf: field.enum };
  }

  // Format-based inference (OpenAPI format hints)
  if (field.format) {
    const fromFormat = inferFromFormat(field.format);
    if (fromFormat) return fromFormat;
  }

  // Name-based inference (heuristics from field name)
  const fromName = inferFromName(field.name);
  if (fromName) return fromName;

  // Type-based fallback
  return inferFromType(field.type);
}

function inferFromFormat(format: string): FieldAnnotation | null {
  const formatMap: Record<string, FieldAnnotation> = {
    "email": { faker: "internet.email" },
    "uuid": { faker: "string.uuid" },
    "date-time": { faker: "date.past", transform: "toISOString" },
    "date": { faker: "date.past", transform: "toISOString" },
    "time": { faker: "date.past", transform: "toISOString" },
    "uri": { faker: "internet.url" },
    "url": { faker: "internet.url" },
    "hostname": { faker: "internet.domainName" },
    "ipv4": { faker: "internet.ipv4" },
    "ipv6": { faker: "internet.ipv6" },
    "password": { faker: "internet.password" },
    "binary": { faker: "string.alphanumeric", fakerArgs: [{ length: 16 }] },
    "byte": { faker: "string.alphanumeric", fakerArgs: [{ length: 8 }] },
    "phone": { faker: "phone.number" },
  };
  return formatMap[format] ?? null;
}

function inferFromName(name: string): FieldAnnotation | null {
  const lower = name.toLowerCase();

  // Matches keywords separated by word boundaries, underscores, or camelCase transitions
  const w = (kw: string) => new RegExp(`(?:^|[^a-z])${kw}(?:[^a-z]|$)`, "i");

  const patterns: Array<[RegExp, FieldAnnotation]> = [
    [w("email|e_mail|e-mail"), { faker: "internet.email" }],
    [w("phone|mobile|tel|telephone|cellphone"), { faker: "phone.number" }],
    [w("url|link|href|website"), { faker: "internet.url" }],
    [w("uuid|guid"), { faker: "string.uuid" }],
    [/^id$/i, { faker: "string.uuid" }],
    [w("firstname|first_name|givenname|given_name"), { faker: "person.firstName" }],
    [w("lastname|last_name|surname|familyname|family_name"), { faker: "person.lastName" }],
    [w("fullname|full_name|displayname|display_name"), { faker: "person.fullName" }],
    [/^name$/i, { faker: "person.fullName" }],
    [w("username|user_name|login"), { faker: "internet.username" }],
    [w("avatar|photo|picture"), { faker: "image.avatar" }],
    [w("bio|description|about|summary|content|body|message"), { faker: "lorem.paragraph" }],
    [w("title|subject|headline|caption"), { faker: "lorem.sentence" }],
    [w("address|street"), { faker: "location.streetAddress" }],
    [/^city$/i, { faker: "location.city" }],
    [/^country$/i, { faker: "location.country" }],
    [w("zip|postal|postcode|zipcode"), { faker: "location.zipCode" }],
    [/^state$/i, { faker: "location.state" }],
    [/^lat$|^latitude$/i, { faker: "location.latitude" }],
    [/^lon$|^lng$|^longitude$/i, { faker: "location.longitude" }],
    [w("price|cost|amount|fee|subtotal"), { faker: "commerce.price" }],
    [/^currency$/i, { faker: "finance.currencyCode" }],
    [/^colou?r$/i, { faker: "color.human" }],
    [w("company|organization|org|employer"), { faker: "company.name" }],
    [w("createdat|created_at|updatedat|updated_at|modifiedat|modified_at|deletedat|deleted_at|timestamp"), { faker: "date.past", transform: "toISOString" }],
    [/^date$/i, { faker: "date.past", transform: "toISOString" }],
    [/^age$/i, { faker: "number.int", fakerArgs: [{ min: 18, max: 90 }] }],
    [w("count|quantity|qty"), { faker: "number.int", fakerArgs: [{ min: 0, max: 100 }] }],
    [w("score|rating|rank|points"), { faker: "number.float", fakerArgs: [{ min: 0, max: 5, fractionDigits: 1 }] }],
    [w("token|secret|apikey|api_key"), { faker: "string.alphanumeric", fakerArgs: [{ length: 32 }] }],
    [/^slug$/i, { faker: "helpers.slugify" }],
    [/^locale$|^lang$|^language$/i, { faker: "location.countryCode" }],
    [w("ipaddress|ip_address"), { faker: "internet.ipv4" }],
    [/^ip$/i, { faker: "internet.ipv4" }],
  ];

  for (const [pattern, annotation] of patterns) {
    if (pattern.test(lower)) return annotation;
  }

  return null;
}

function inferFromType(type: SchemaField["type"]): FieldAnnotation | null {
  switch (type) {
    case "string": return { faker: "lorem.word" };
    case "number": return { faker: "number.float", fakerArgs: [{ min: 0, max: 1000, fractionDigits: 2 }] };
    case "integer": return { faker: "number.int", fakerArgs: [{ min: 0, max: 1000 }] };
    case "boolean": return { faker: "datatype.boolean" };
    default: return null;
  }
}

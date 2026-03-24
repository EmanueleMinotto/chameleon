# Annotations

The annotation system lets you control how fake data is generated for every field in your API responses — without touching your schema files.

Annotations live in separate YAML files and are deep-merged in alphabetical order at startup. You can split them across as many files as you want.

---

## File format

```yaml
version: 1

paths:
  /users/{id}:
    get:
      response:
        "$.email":
          faker: "internet.email"
        "$.age":
          faker: "number.int"
          fakerArgs:
            - min: 18
              max: 90

graphql:
  types:
    User:
      email:
        faker: "internet.email"

inferenceHints:
  "*.email": { faker: "internet.email" }
  "*.phone": { faker: "phone.number" }
```

---

## Annotation types

### `faker` — Faker.js method

Calls any [Faker.js](https://fakerjs.dev/api/) method by dot-notation path.

```yaml
"$.name":
  faker: "person.fullName"

"$.email":
  faker: "internet.email"

"$.price":
  faker: "commerce.price"
```

### `faker` + `fakerArgs` — Faker.js with arguments

Pass arguments to the Faker.js method. Each item in `fakerArgs` is spread as a positional argument.

```yaml
"$.age":
  faker: "number.int"
  fakerArgs:
    - min: 18
      max: 90

"$.bio":
  faker: "lorem.paragraphs"
  fakerArgs:
    - 2         # count

"$.date":
  faker: "date.between"
  fakerArgs:
    - from: "2020-01-01"
      to: "2024-12-31"
```

### `faker` + `transform` — Post-process the result

Call a method on the value returned by Faker.js. Useful for converting `Date` objects to strings.

```yaml
"$.createdAt":
  faker: "date.past"
  transform: "toISOString"

"$.code":
  faker: "string.alphanumeric"
  fakerArgs:
    - 8
  transform: "toUpperCase"
```

### `custom` — Custom TypeScript generator

Point to a `.ts` file that exports a default function. The function receives a `GeneratorContext` and returns any value.

```yaml
"$.productCode":
  custom: "./chameleon/generators/productCode.ts"
```

```typescript
// chameleon/generators/productCode.ts
import type { GeneratorContext } from "@chameleon/core";

export default function ({ faker, schemaField }: GeneratorContext): string {
  return `PROD-${faker.string.alphanumeric(8).toUpperCase()}`;
}
```

The `GeneratorContext` includes:

| Property | Type | Description |
|---|---|---|
| `faker` | `Faker` | The configured Faker.js instance |
| `schemaField` | `SchemaField` | Metadata about the field (name, type, format, path) |

### `static` — Literal value or JSON file

Return a fixed value for every request. Accepts a primitive value or a path to a JSON file.

```yaml
# Literal string
"$.role":
  static: "user"

# Literal number
"$.version":
  static: 2

# JSON file (contents are deep-merged)
"$.address":
  static: "./chameleon/data/address.json"
```

### `oneOf` — Random from a list

Pick one value at random from an array on each request.

```yaml
"$.status":
  oneOf: ["active", "inactive", "pending", "suspended"]

"$.country":
  oneOf: ["IT", "US", "DE", "FR", "ES"]
```

### `arrayLength` — Control array size

Set the minimum and maximum number of items generated for an array field.

```yaml
"$.tags":
  arrayLength:
    min: 1
    max: 5

"$.items":
  arrayLength:
    min: 10
    max: 10   # exact length
```

---

## JSONPath field selectors

Field selectors use [JSONPath Plus](https://jsonpath-plus.github.io/JSONPath/docs/ts/) syntax. They are matched against the response schema structure.

```yaml
# Top-level field
"$.email": ...

# Nested field
"$.address.city": ...

# All fields named "id" at any depth
"$..id": ...

# First item in an array
"$.items[0].name": ...
```

---

## GraphQL type annotations

Use the `graphql.types` section to annotate GraphQL response fields by type name:

```yaml
graphql:
  types:
    User:
      email:
        faker: "internet.email"
      avatarUrl:
        faker: "image.avatar"
    Product:
      price:
        faker: "commerce.price"
      sku:
        custom: "./chameleon/generators/sku.ts"
```

---

## Inference hints

`inferenceHints` are global fallback rules applied when no explicit annotation is found for a field. Keys use glob patterns matched against the field name.

```yaml
inferenceHints:
  "*.email":     { faker: "internet.email" }
  "*.phone":     { faker: "phone.number" }
  "*.firstName": { faker: "person.firstName" }
  "*.lastName":  { faker: "person.lastName" }
  "*.avatar":    { faker: "image.avatar" }
  "*.createdAt": { faker: "date.past", transform: "toISOString" }
  "*.updatedAt": { faker: "date.recent", transform: "toISOString" }
```

---

## Auto-inference

When no annotation and no inference hint matches a field, Chameleon infers a generator automatically from:

1. **Field format** (OpenAPI `format` property): `date-time`, `email`, `uri`, `uuid`, etc.
2. **Field name patterns**: fields ending in `Email`, `Phone`, `Name`, `Id`, `Url`, etc.
3. **Field type**: `string` → `lorem.word`, `number` → `number.int`, `boolean` → `datatype.boolean`, etc.

---

## Multi-file merge

All annotation files matched by the glob in your config are deep-merged. Later files (alphabetically) override earlier ones for the same path + field combination.

```typescript
// chameleon.config.ts
annotations: "./chameleon/annotations/**/*.annotations.yml"
```

This lets you split annotations by domain:

```
annotations/
├── users.annotations.yml      ← /users/** routes
├── orders.annotations.yml     ← /orders/** routes
└── global.annotations.yml     ← inferenceHints
```

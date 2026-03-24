# Schemas

Chameleon can load multiple schema formats simultaneously. All loaded schemas are merged into a single route table — a request is matched against all routes and the first match wins.

Configure schemas in `chameleon.config.ts` under the `schemas` key:

```typescript
import { defineConfig } from "@chameleon/core";

export default defineConfig({
  schemas: {
    openapi: "./chameleon/schemas/api.openapi.yaml",
    graphql: "./chameleon/schemas/schema.graphql",
    postman: "./chameleon/schemas/collection.postman.json",
    pact: "./chameleon/schemas/pacts/",
    static: "./chameleon/data/",
  },
});
```

Each key accepts a single path string or an array of paths. Glob patterns and directory paths are supported where noted.

---

## OpenAPI (v2 / v3)

**Config key:** `openapi`

Parses OpenAPI 2.0 (Swagger) and OpenAPI 3.x documents. Both YAML and JSON are supported.

```typescript
schemas: {
  openapi: "./chameleon/schemas/api.openapi.yaml",
  // or multiple files:
  openapi: [
    "./chameleon/schemas/users.openapi.yaml",
    "./chameleon/schemas/orders.openapi.yaml",
  ],
}
```

Chameleon extracts every `paths` entry and registers a route for each `operationId`. Response schemas are used to infer field types for fake data generation.

**Supported response schema types:** `string`, `number`, `integer`, `boolean`, `array`, `object`.

**Formats used for inference:** `date`, `date-time`, `email`, `uri`, `uuid`, `hostname`, `ipv4`, `ipv6`, `byte`, `password`.

---

## GraphQL SDL

**Config key:** `graphql`

Parses a GraphQL schema definition file. Chameleon registers a `/graphql` endpoint that handles both `POST` (queries and mutations) and `GET` (introspection).

```typescript
schemas: {
  graphql: "./chameleon/schemas/schema.graphql",
}
```

Example schema:

```graphql
type Query {
  user(id: ID!): User
  users: [User!]!
}

type User {
  id: ID!
  name: String!
  email: String!
  age: Int
  createdAt: String
}
```

GraphQL fields can be annotated in the `graphql.types` section of an annotation file:

```yaml
graphql:
  types:
    User:
      email:
        faker: "internet.email"
      createdAt:
        faker: "date.past"
        transform: "toISOString"
```

---

## Postman Collections

**Config key:** `postman`

Parses a Postman Collection v2.1 JSON file. Each request in the collection becomes a route. Example responses defined in the collection are used as the response template.

```typescript
schemas: {
  postman: "./chameleon/schemas/petstore.postman.json",
}
```

If a request has multiple saved example responses, Chameleon uses the first one.

---

## Pact Contracts

**Config key:** `pact`

Parses Pact contract files (JSON). Point it at a single file or a directory — all `.json` files in the directory are loaded.

```typescript
schemas: {
  pact: "./chameleon/schemas/pacts/",
  // or a single file:
  pact: "./chameleon/schemas/consumer-provider.pact.json",
}
```

Each interaction in the Pact file becomes a route. The `response.body` from the interaction is used as the response template.

---

## Static JSON

**Config key:** `static`

Serves static JSON files as fixed responses. Point it at a directory — each `.json` file becomes a route based on its filename.

```typescript
schemas: {
  static: "./chameleon/data/",
}
```

For example, `./chameleon/data/users.json` would be served at `GET /users`.

Static JSON routes are also used by the [Overlays](Overlays) system as base response templates.

---

## Route precedence

When multiple schemas define the same path and method, the first match in this order wins:

1. OpenAPI
2. GraphQL
3. Postman
4. Pact
5. Static JSON

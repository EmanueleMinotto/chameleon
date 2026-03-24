# Contributing to Chameleon

Thank you for your interest in contributing! Please read this guide before opening a pull request.

## Conventional Commits

All commits **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. PRs with non-conforming commit messages will not be merged.

**Format:**

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**Allowed types:**

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `chore`    | Build, tooling, CI changes                              |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or fixing tests                                  |
| `perf`     | Performance improvement                                 |

**Allowed scopes** (optional):

| Scope    | Package             |
| -------- | ------------------- |
| `core`   | `@chameleon/core`   |
| `server` | `@chameleon/server` |
| `cli`    | `@chameleon/cli`    |
| `vercel` | `@chameleon/vercel` |

**Examples:**

```
feat(core): add Pact parser
fix(server): handle empty response schema gracefully
docs: update annotation format in README
chore: upgrade faker to v9.1
test(core): add unit tests for OpenAPI field walker
```

## Development Setup

```bash
# Clone the repository
git clone https://github.com/EmanueleMinotto/chameleon.git
cd chameleon

# Install dependencies (requires pnpm >= 9 and Node >= 18)
pnpm install

# Build all packages
pnpm build

# Start the Petstore example
pnpm --filter @chameleon/cli exec chameleon serve \
  --config chameleon/chameleon.config.ts \
  --watch
```

## Linting

All code must pass lint checks before a PR can be merged. Run:

```bash
pnpm lint
pnpm format:check
```

To auto-fix issues:

```bash
pnpm lint:fix
pnpm format
```

Linting uses **ESLint** with `@typescript-eslint` and **Prettier**. Configuration files:

- [`eslint.config.mjs`](eslint.config.mjs)
- [`.prettierrc.json`](.prettierrc.json)

## Testing

All new parsers, generators, and annotation resolvers must be covered by unit tests. Run:

```bash
pnpm test
```

Tests use **Vitest** and live alongside source files as `*.test.ts` files.

**Coverage requirements:**

- New parsers: test at least 3 example schema shapes
- New generators: test the happy path and an edge case (empty field, missing annotation)
- New annotation resolvers: test exact match, pattern match, and inference fallback

## Pull Request Workflow

1. Fork the repository
2. Create a branch: `git checkout -b feat/my-feature` or `fix/the-bug`
3. Commit using Conventional Commits format
4. Ensure `pnpm lint` and `pnpm test` pass
5. Open a PR against `main`

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

By participating, you agree to uphold this code. Please report unacceptable behavior to the maintainers.

# Effect-Actor Agent Guidelines

## Build/Lint/Test Commands

**All packages (root level):**
- `bun run test` - Run all tests with turbo
- `bun run build` - Build all packages
- `bun run lint` - Lint all packages with biome
- `bun run format` - Format all packages with biome

**Single package (packages/effect-actor):**
- `bun run test` - Run tests (vitest run)
- `bun run test:watch` - Run tests in watch mode (vitest)
- `bun run test:ui` - Run tests with UI (vitest --ui)
- `bun run test:coverage` - Run tests with coverage
- `bun run build` - Type check (tsc --noEmit)
- `bun run lint` - Lint with biome
- `bun run format` - Format with biome
- `bun test <file>` - Run single test file

## Architecture & Structure

- **Monorepo**: Turbo-managed workspace with packages/* structure
- **Main package**: `effect-actor` - Effect-native actor orchestration framework with statechart semantics
- **Core dependencies**: Effect (functional programming)
- **Inspiration**: Built on XState's proven statechart model but Effect-native with zero external dependencies
- **Key modules**:
  - `src/actor/` - Actor runtime and state management
  - `src/machine/` - State machine execution logic
  - `src/spec/` - Actor specification types and validation
  - `src/providers/` - Provider implementations
  - `src/errors.ts` - Effect-tagged error classes

## Code Style Guidelines

### Imports & Modules
- Use ES module imports with `.js` extensions
- Import Effect utilities: `import { Effect, Schema } from "effect"`
- Import types separately: `import type { ActorSpec } from "../spec/types.js"`

### Types & Generics
- Use generic context types: `<TContext = any>`
- Leverage Effect's Schema for runtime validation
- Strict TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`

### Error Handling
- Use `Effect.Effect<T, E>` for operations that may fail
- Custom errors extend `Data.TaggedError`
- Use `Effect.gen(function* () { ... })` for complex operations
- Schema validation: `yield* Schema.decodeUnknown(schema)(data)`

### Testing
- Use `bun:test` with `describe`, `test`, `expect`
- Test Effect operations with `Exit` and `Cause` utilities
- Extract errors from failed Effects using `Cause.failureOption`

### Naming & Structure
- Functions use camelCase
- Types use PascalCase with descriptive names
- Error classes: `*Error` suffix
- JSDoc comments for public APIs

### CLAUDE.md Rules
- Prefer Bun APIs: `Bun.serve()`, `bun:sqlite`, `Bun.redis`, etc.
- Use `bun test` instead of jest/vitest directly
- HTML imports for frontend, no Vite

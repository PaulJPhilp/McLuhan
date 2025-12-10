# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

All commands use **Bun** as the package manager.

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Type checking (strict mode)
bun run typecheck

# Run all tests
bun run test
bun run test:watch          # Watch mode

# Code quality (Biome with Ultracite preset)
bun run lint                # Check code with Biome
bun run format:fix          # Fix formatting issues

# Build, test, lint a specific package
bun run --filter effect-supermemory build
bun run --filter effect-cli-tui test
bun run --filter effect-actor lint
```

## Monorepo Architecture

McLuhan is a **monorepo of four Effect-native packages** with a strict **layered architecture** where each package has a specific responsibility.

### Layer Structure (Dependency Direction)

```
┌─────────────────────────────────────┐
│        Application Layer            │
│          (apps/ - future)           │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   effect-actor (Actor Orchestration)│
│  - Statechart-based orchestration   │
│  - Can optionally use effect-ai-sdk │
│  - No required dependencies         │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│    effect-cli-tui (Terminal UI)     │
│  - Interactive prompts & display    │
│  - Can optionally use effect-ai-sdk │
│  - Depends on: effect-supermemory   │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  effect-supermemory (Memory Layer)  │
│  - Supermemory API client           │
│  - Effect-native services           │
│  - No package dependencies          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   effect-ai-sdk (AI Operations)     │
│  - Vercel AI SDK v5 wrapper         │
│  - 8+ provider support              │
│  - Functional library pattern       │
│  - No package dependencies          │
│  (Independent utility layer)        │
└─────────────────────────────────────┘
```

### Package Purposes

**effect-supermemory** (`packages/effect-supermemory/`)
- Type-safe Effect client for Supermemory's long-term memory API
- Core services: MemoriesService, SearchService, ConnectionsService, ToolsService
- Effect.Service pattern with namespaced isolation
- All operations return `Effect.Effect<T, E>`
- **No interdependencies** (foundational layer)

**effect-cli-tui** (`packages/effect-cli-tui/`)
- Terminal UI components and CLI utilities
- Classes: `EffectCLI` (command execution), `TUIHandler` (interactive prompts)
- Display functions for styled output (colors, tables, boxes, spinners)
- Uses `effect-supermemory` for memory-backed features
- **Depends on:** effect-supermemory

**effect-actor** (`packages/effect-actor/`)
- State machine orchestration framework (xState-inspired)
- Statechart-based actor patterns
- Effect-native implementation
- **No package dependencies** (can optionally use others)

**effect-ai-sdk** (`packages/effect-ai-sdk/`)
- Effect-native wrapper around Vercel AI SDK v5
- Type-safe AI operations: text generation, object generation, embeddings, streaming, tool calling
- 8+ AI provider support (OpenAI, Anthropic, Google, Groq, DeepSeek, Perplexity, xAI, Qwen)
- Functional library pattern (not Effect.Service)
- Message transformation utilities (Effective ↔ Vercel format)
- **No interdependencies** (independent utility layer)

## Critical Architectural Patterns

### 1. Effect.Service with Effect.fn() Parameterization

All services use this mandatory pattern:

```typescript
export class MyService extends Effect.Service<MyService>()(
  "MyService",
  {
    effect: Effect.fn(function* (config: ConfigType) {
      // Service implementation with namespace/config isolation
      return {
        method: (arg) => Effect.sync(() => { /* ... */ }),
      } satisfies MyServiceApi;
    }),
  }
) {}

// Usage
const layer = MyService.Default(config);
const program = Effect.gen(function* () {
  const service = yield* MyService;
  return yield* service.method(arg);
}).pipe(Effect.provide(layer));
```

**FORBIDDEN:**
- ❌ `Context.Tag` or `Context.GenericTag`
- ❌ Service classes with "Live", "Impl", or "Layer" suffixes
- ❌ Direct instantiation with `new MyService()`

### 2. Error Handling with Data.TaggedError

All errors are discriminated unions:

```typescript
export class MemoryNotFoundError extends Data.TaggedError("MemoryNotFoundError")<{
  readonly key: string;
}> {}

// Usage with type-safe catching
.pipe(
  Effect.catchTag('MemoryNotFoundError', (err) => {
    // err.key is available here
  })
)
```

### 3. Service API Contracts

All services define their API as interfaces in `api.ts`:

```typescript
// MUST use interface (not type) for object contracts
export interface MyServiceApi {
  readonly method1: (arg: string) => Effect.Effect<Result, MyError>;
  readonly method2: () => Effect.Effect<void, MyError>;
}
```

### 4. File Structure Convention

Each service follows this organization:

```
services/[serviceName]/
  ├── __tests__/
  │   └── unit.test.ts       # Vitest unit tests
  ├── api.ts                 # Interface contract (interface keyword required)
  ├── errors.ts              # Discriminated error types
  ├── types.ts               # Data types and configuration
  ├── service.ts             # Effect.Service implementation
  ├── helpers.ts             # (optional) Utilities
  └── index.ts               # Public exports

src/
  ├── index.ts               # Root exports (re-exports services)
  ├── Domain.ts              # Domain schemas using Effect.Schema
  ├── Config.ts              # Configuration
  ├── Errors.ts              # Domain error types
  └── [Feature].ts           # Domain features
```

## Package-Specific Details

### effect-supermemory

**Key services:**
- `InMemoryClient` — In-memory key-value store with namespace isolation
- `SupermemoryClient` — HTTP-backed client for Supermemory API
- `SearchClient` — Semantic search with filtering (Effect.Stream support)
- `MemoryStreamClient` — Streaming operations for large datasets

**Important patterns:**
- Base64 encoding for all memory values (automatic in client)
- Namespace isolation via parameterized layers: `SupermemoryClient.Default("namespace")`
- Retry policy configurable at layer construction time
- Batch operations with partial failure handling
- Semantic 404 handling: `get()` returns `undefined`, not error

**Build & Test:**
```bash
bun run --filter effect-supermemory build
bun run --filter effect-supermemory test
bun run --filter effect-supermemory test:watch
bun run --filter effect-supermemory test:integration  # Requires real API
```

See `packages/effect-supermemory/CLAUDE.md` for detailed architecture docs.

### effect-cli-tui

**Key classes:**
- `EffectCLI` — Execute CLI commands, capture output
- `TUIHandler` — Interactive prompts (prompt, selectOption, multiSelect, confirm, password)

**Display utilities:**
- Core: `display()`, `displayLines()`, `displayJson()`, `displayOutput()`
- Styling: `displaySuccess()`, `displayError()`, `displayWarning()`, `displayMuted()`, `displayHighlight()`
- Components: `displayTable()`, `displayBox()`, `displayPanel()`
- Progress: `spinnerEffect()`, `startSpinner()`, `updateSpinner()`, `stopSpinner()`

**Validation:**
- ✅ Use **Effect Schema** for input validation (NOT Zod)
- ✅ Prefer `Schema.Class` over `Schema.Struct`
- Example: `projectNameSchema = Schema.String.pipe(Schema.minLength(3), Schema.maxLength(50))`

**Build & Test:**
```bash
bun run --filter effect-cli-tui build
bun run --filter effect-cli-tui test
bun run --filter effect-cli-tui test:watch
bun run --filter effect-cli-tui test:ui          # Interactive test UI
```

See `packages/effect-cli-tui/CLAUDE.md` for detailed documentation.

### effect-actor

**Core concept:**
- Statechart-based state machine orchestration (xState-inspired)
- Effect-native implementation
- Composable actor patterns

**Build & Test:**
```bash
bun run --filter effect-actor build
bun run --filter effect-actor test
bun run --filter effect-actor test:watch
```

See `packages/effect-actor/CLAUDE.md` for detailed documentation.

## Code Quality & Standards

**Biome Configuration:**
- Preset: `ultracite/core` (Ultracite zero-config Biome preset)
- Enforces modern TypeScript, proper error handling, performance best practices

**TypeScript Configuration:**
- `strict: true` with `exactOptionalPropertyTypes: true`
- `target: ES2022`, `module: ESNext`
- Strict null checks and no implicit any
- Path aliases: `@/*` maps to `packages/*`
- Effect language service plugin enabled

**Import Conventions:**
```typescript
// Effect - namespace imports
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Data } from "effect";

// Internal - absolute paths with .js extension (ESM)
import { MyService } from "@effect-supermemory/services/MyService/service.js";
```

**Naming Conventions:**
- Service classes: PascalCase, no suffix (e.g., `InMemoryClient`, not `InMemoryClientLive`)
- Interfaces: PascalCase + "Api" suffix (e.g., `InMemoryClientApi`)
- Error classes: PascalCase + "Error" suffix (e.g., `MemoryNotFoundError`)
- Files: lowercase (e.g., `service.ts`, `helpers.ts`, `api.ts`)

**Forbidden Patterns:**
- ❌ Double casts: `as unknown as Type` (bypasses type safety)
- ❌ Service suffixes: "Live", "Impl", "Layer"
- ❌ `Context.Tag` or direct service instantiation with `new`
- ❌ Zod for validation (use Effect Schema only)

## Testing Strategy

**Test Framework:** Vitest with @effect/vitest integration

**Key Principles:**
- ✅ Write real integration tests with actual services
- ✅ No mocking of external dependencies (anti-mocking policy)
- ✅ Use Effect dependency injection with mock layers for testing
- ✅ Test error paths with `Effect.catchTag()`

**Running Tests:**
```bash
bun run test                  # All packages
bun run test:watch           # Watch mode
bun run --filter effect-supermemory test:integration  # Requires API
```

**Test Pattern:**
```typescript
import { describe, it, expect } from "vitest";
import * as Effect from "effect/Effect";
import { MyService } from "../service.js";

describe("MyService", () => {
  const testLayer = MyService.Default("test-config");

  it("does something", async () => {
    const program = Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.method("arg");
      return result;
    }).pipe(Effect.provide(testLayer));

    const result = await Effect.runPromise(program);
    expect(result).toBe(expected);
  });
});
```

## Workspace Dependencies

Packages use the workspace protocol for interdependencies:

```json
{
  "dependencies": {
    "effect-supermemory": "workspace:*"
  }
}
```

**Dependency Rules:**
- effect-cli-tui depends on effect-supermemory ✅
- effect-actor is independent ✅
- effect-supermemory is independent ✅
- **No circular dependencies** — enforce strict layering

## Key Files & Where to Look

**Monorepo Root:**
- `package.json` — Workspace definition and root scripts
- `tsconfig.json` — Shared TypeScript configuration
- `biome.jsonc` — Biome/Ultracite configuration
- `bunfig.toml` — Bun configuration
- `README.md` — Project overview
- `docs/ARCHITECTURE.md` — Detailed architecture documentation

**Per-Package:**
- `src/index.ts` — Public API exports
- `src/Domain.ts` or `Domain/` — Domain models and schemas
- `services/` — Effect.Service implementations
- `test/` or `__tests__/` — Test suites
- `CLAUDE.md` — Package-specific guidance (if exists)

## Development Workflow

1. **Choose package to work on:** Use `bun run --filter [package-name]` for package-specific commands
2. **Make changes** in `src/` or `services/`
3. **Run tests** to verify: `bun run --filter [package] test`
4. **Type-check** for errors: `bun run typecheck`
5. **Lint & format:** `bun run lint` then `bun run format:fix`
6. **Build for verification:** `bun run --filter [package] build`

**Multi-package development:**
- If changes span multiple packages, run full suite: `bun run test && bun run lint && bun run build`
- Workspace dependencies are resolved automatically

## Common Gotchas

1. **Import paths:** Always use absolute paths with `.js` extension for ESM: `import { X } from "@packages/y/src/X.js"`
2. **Service instantiation:** Use dependency injection with layers, not `new MyService()`
3. **Context.Tag:** Never use—always use `Effect.Service` instead
4. **Type vs Interface:** Use `interface` for object contracts in `api.ts` files
5. **Error handling:** Use `Data.TaggedError` with discriminated unions, not generic errors
6. **Testing:** No mocking external services; use real implementations or skip tests

## Architecture Decision Records

See `docs/ARCHITECTURE.md` for:
- Detailed layer architecture
- Service pattern rationale
- Error handling philosophy
- Cross-package integration patterns
- Future enhancements (effect-tools, example applications)

## External Documentation

- **Effect.ts**: https://effect.website
- **Biome**: https://biomejs.dev
- **Ultracite**: https://github.com/Phylogenic/ultracite
- **Bun**: https://bun.sh

## Important Notes

- All packages build independently but share TypeScript configuration
- Each package maintains its own version for independent npm publishing
- Changesets (to be configured) will coordinate releases
- The `apps/` directory is reserved for future example applications
- No configuration files in `.cursor/rules/` or `.github/copilot-instructions.md`

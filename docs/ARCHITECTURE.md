# McLuhan Architecture

## Overview

McLuhan is a monorepo containing Effect-native packages that provide infrastructure for building AI agents. The architecture follows a layered approach where each package provides a specific capability.

## Layer Architecture

```
┌─────────────────────────────────────┐
│     Application Layer (apps/)       │
│  (Future: Example applications)     │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      effect-actor                    │
│  (Actor Orchestration Layer)        │
│  (optional: effect-ai-sdk)          │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      effect-cli-tui                  │
│  (Terminal UI Layer)                 │
│  (optional: effect-ai-sdk)          │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      effect-supermemory               │
│  (Memory Layer)                      │
│  (no AI dependencies)               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      effect-ai-sdk                   │
│  (AI Operations Layer)               │
│  (Independent utility layer)         │
└─────────────────────────────────────┘
```

## Package Descriptions

### effect-supermemory (Memory Layer)

**Purpose**: Provides long-term semantic memory for AI agents.

**Key Services**:
- `MemoriesService`: Core memory operations (put, get, delete, search)
- `SearchService`: Semantic search with filtering
- `ConnectionsService`: Connection management
- `SettingsService`: Configuration management
- `ToolsService`: Tool schema generation

**Architecture Pattern**:
- Effect.Service with Effect.fn() parameterization
- Discriminated error types (Data.TaggedError)
- Namespace isolation for multi-tenant support
- Base64 encoding for memory values

**Dependencies**: None (foundational layer)

### effect-cli-tui (TUI Layer)

**Purpose**: Terminal user interface components for CLI applications.

**Key Features**:
- Interactive prompts
- Display utilities
- CLI wrapper components

**Integration**: Uses `effect-supermemory` for memory-backed CLI features.

**Dependencies**: `effect-supermemory`

### effect-actor (Actor Orchestration Layer)

**Purpose**: Statechart-based actor orchestration for AI agents.

**Key Features**:
- xState-inspired statechart concepts
- Effect-native implementation
- Composable actor patterns

**Dependencies**: None (can use other packages as needed)

### effect-ai-sdk (AI Operations Layer)

**Purpose**: Effect-native wrapper around Vercel AI SDK v5 providing type-safe AI operations.

**Key Features**:
- Text generation, object generation, embeddings
- Image generation, speech synthesis, audio transcription
- Streaming support with unified event system
- Tool calling and orchestration
- Message transformation (Effective ↔ Vercel format)
- 8+ AI provider support

**Supported Providers**:
- OpenAI (language models, embeddings, images, speech)
- Anthropic (language models)
- Google Gemini (language models, embeddings)
- Groq (language models)
- DeepSeek (language models)
- Perplexity (language models)
- xAI/Grok (language models)
- Qwen/Alibaba (language models)

**Architecture Pattern**:
- Functional library pattern (not Effect.Service)
- Functions return `Effect.Effect<T, E>` for composability
- Discriminated error types (Data.TaggedError)
- Type-safe schema utilities

**Dependencies**: None (independent utility layer)

**Integration Points**:
- effect-actor: AI-powered state transitions
- effect-cli-tui: Interactive AI prompts and responses
- effect-supermemory: Embedding generation for memory operations

## Design Principles

### 1. Effect-Native

All packages use Effect.ts for:
- Type-safe error handling
- Dependency injection via Effect.Service
- Composable, testable code

### 2. Service Pattern

All services follow the Effect.Service pattern:

```typescript
export class MyService extends Effect.Service<MyService>()(
  "MyService",
  {
    effect: Effect.fn(function* (config: Config) {
      // Service implementation
      return {
        // Service methods
      } satisfies MyServiceApi;
    }),
  }
) {}
```

### 3. Error Handling

All errors are discriminated using `Data.TaggedError`:

```typescript
export class MyError extends Data.TaggedError("MyError")<{
  readonly message: string;
}> {}
```

### 4. Namespace Isolation

Services that support multi-tenancy use namespace isolation through parameterized layers:

```typescript
const layer = MyService.Default("namespace");
```

## Cross-Package Integration

### Workspace Protocol

Packages depend on each other using the workspace protocol:

```json
{
  "dependencies": {
    "effect-supermemory": "workspace:*"
  }
}
```

### Import Patterns

Packages import from each other using standard package names:

```typescript
import { MemoriesService } from "effect-supermemory";
```

## Future Enhancements

### effect-tools

A future package for tool execution layer, extracted from `effect-supermemory/ToolsService` if it grows large enough.

### Example Applications

The `apps/` directory will contain example applications demonstrating integration of multiple McLuhan packages.

## Testing Strategy

- **Unit Tests**: Co-located with source code in `__tests__/` directories
- **Integration Tests**: In `test/` directories
- **No Mocking**: Real implementations preferred (anti-mocking policy)

## Versioning

Each package maintains its own version. The monorepo uses Changesets for coordinated versioning (to be configured).

## Build & Distribution

Each package:
- Builds independently
- Maintains its own `dist/` output
- Can be published independently
- Follows standard Effect.ts library patterns

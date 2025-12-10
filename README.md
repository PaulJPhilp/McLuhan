# McLuhan Monorepo

A monorepo containing Effect-native packages for building AI agent infrastructure.

## Architecture

McLuhan provides a layered architecture for AI agent development:

- **effect-supermemory**: Memory layer - long-term semantic memory for AI agents
- **effect-cli-tui**: TUI layer - terminal user interface components
- **effect-actor**: Actor orchestration - statechart-based agent orchestration
- **effect-ai-sdk**: AI operations layer - type-safe AI operations with 8+ provider support

## Packages

### `effect-supermemory`

Effect-native client for Supermemory's long-term memory API. Provides type-safe, composable services for memory operations.

**Key Features:**
- Type-safe memory operations (put, get, delete, search)
- Effect-native error handling
- Streaming support for large datasets
- Semantic search with filtering

### `effect-cli-tui`

Terminal user interface components built with Effect. Provides prompts, display utilities, and CLI wrappers.

**Key Features:**
- Interactive prompts
- Display utilities
- CLI wrapper components
- Supermemory integration

### `effect-actor`

Actor orchestration framework built on xState statechart concepts, fully Effect-native.

**Key Features:**
- Statechart-based orchestration
- Effect-native implementation
- Composable actor patterns

### `effect-ai-sdk`

Effect-native wrapper around Vercel AI SDK v5 providing type-safe AI operations with support for 8+ providers.

**Key Features:**
- Text generation, object generation, embeddings
- Image generation, speech synthesis, audio transcription
- Streaming support with unified event system
- Tool calling and orchestration
- 8+ AI providers (OpenAI, Anthropic, Google, Groq, DeepSeek, Perplexity, xAI, Qwen)
- Functional library pattern for flexibility

## Development

### Prerequisites

- Bun 1.1.33+
- Node.js 18.18+

### Setup

```bash
bun install
```

### Build

Build all packages:

```bash
bun run build
```

Build a specific package:

```bash
bun run --filter effect-supermemory build
```

### Test

Run all tests:

```bash
bun run test
```

Run tests for a specific package:

```bash
bun run --filter effect-supermemory test
```

### Lint & Format

Lint all packages:

```bash
bun run lint
```

Format all packages:

```bash
bun run format:fix
```

## Package Dependencies

Packages can depend on each other using the workspace protocol:

```json
{
  "dependencies": {
    "effect-supermemory": "workspace:*"
  }
}
```

## Documentation

See `docs/ARCHITECTURE.md` for detailed architecture documentation.

## License

MIT

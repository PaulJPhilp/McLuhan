# effect-ai-sdk

**Effect-native AI SDK** - Type-safe wrapper around Vercel AI SDK v6 with support for 8+ providers including **GPT-5**, Claude 3.5 Sonnet, Gemini 2.0 Flash, and more.

Provides a composable, functional programming interface using Effect-TS for AI operations with comprehensive error handling and type safety.

## Features

- ✨ **GPT-5 Support** - Latest OpenAI models and all major providers
- 💬 **Chat Completions** - With streaming support
- 📊 **Structured Output** - Generate typed objects from prompts
- 🔍 **Embeddings** - Vector embeddings for semantic search
- 🎨 **Image Generation** - Text-to-image with multiple providers
- 🎤 **Audio Operations** - Speech generation and transcription
- 🛠️ **Tool Calling** - Function calling with Zod or Effect.Schema
- 8️⃣ **8+ Providers** - OpenAI, Anthropic, Google, Groq, DeepSeek, Perplexity, xAI, Qwen
- 🔒 **Type Safe** - Full TypeScript support with discriminated unions
- 📈 **Streaming** - Real-time responses with Effect.Stream
- ⚡ **Effect Native** - Composable with Effect.Effect<T, E>

## Installation

```bash
# Install effect-ai-sdk and provider packages
bun add effect-ai-sdk @ai-sdk/openai @ai-sdk/anthropic
```

## Quick Start

```typescript
import * as Effect from "effect/Effect";
import { generateText } from "effect-ai-sdk";
import { createOpenAI } from "@ai-sdk/openai";

// Create provider
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = openai("gpt-5"); // ✨ GPT-5 support!

// Generate text
const program = Effect.gen(function* () {
  const result = yield* generateText(model, {
    text: "What are the benefits of Effect-TS?"
  });
  return result.data.text;
});

const response = await Effect.runPromise(program);
console.log(response);
```

## Usage Examples

### Text Generation with System Prompt
```typescript
const result = yield* generateText(model, {
  text: "Explain quantum computing"
}, {
  system: "You are a physics expert. Explain clearly."
});
```

### Structured Output (Object Generation)
```typescript
const schema = Schema.Struct({
  title: Schema.String,
  summary: Schema.String,
  keywords: Schema.Array(Schema.String)
});

const result = yield* generateObject(model, {
  text: "Summarize this article..."
}, schema);

console.log(result.data.object); // Typed result!
```

### Embeddings
```typescript
const embedding = createOpenAI().embedding("text-embedding-3-small");

const result = yield* generateEmbeddings(embedding, [
  "Hello world",
  "Goodbye world"
]);

console.log(result.data.embeddings); // Vector arrays
```

## Migration from v5

**Upgrading from effect-ai-sdk v5?** See the [Migration Guide](./MIGRATION-v6.md) for detailed instructions and breaking changes.

**TL;DR:** Most code works without changes. Update dependencies and you're good to go!

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive API documentation and examples
- **[MIGRATION-v6.md](./MIGRATION-v6.md)** - Upgrade guide from v5 to v6
- **Examples** - See `test/` directory for more usage examples

## Supported Providers & Models

| Provider | Language Model | Embeddings | Images | Audio |
|----------|---|---|---|---|
| **OpenAI** | gpt-5, gpt-4o, gpt-4, gpt-3.5-turbo | ✅ | ✅ | ✅ |
| **Anthropic** | Claude 3.5 Sonnet, Opus, Haiku | ❌ | ❌ | ❌ |
| **Google** | Gemini 2.0 Flash, Gemini 1.5 | ✅ | ❌ | ❌ |
| **Groq** | Mixtral 8x7B, Llama 2 70B | ❌ | ❌ | ❌ |
| **DeepSeek** | DeepSeek Chat, DeepSeek Coder | ❌ | ❌ | ❌ |
| **Perplexity** | pplx-70b-online, pplx-7b-online | ❌ | ❌ | ❌ |
| **xAI** | Grok 2, Grok 1 | ❌ | ❌ | ❌ |
| **Qwen** | Qwen Max, Plus, Turbo | ❌ | ❌ | ❌ |

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Run tests (unit tests, no API keys needed)
bun run test

# Run with integration tests (requires OPENAI_API_KEY)
OPENAI_API_KEY=sk-... bun run test

# Type checking
bun run typecheck

# Linting and formatting
bun run lint
bun run format:fix
```

## Test Coverage

- **Unit Tests**: 50 tests covering all core operations
- **Integration Tests**: 13 tests with real OpenAI API calls
- **Coverage**: 85%+ for core operations and message types

## Version Information

- **effect-ai-sdk**: v6.0.0+
- **Vercel AI SDK**: ^6.0.5
- **@ai-sdk/* providers**: ^3.x (v2 model spec)
- **Node.js**: 18.18+
- **Bun**: 1.1.33+

## Support

- **Issues**: Report bugs on [GitHub](https://github.com/PaulJPhilp/McLuhan/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/PaulJPhilp/McLuhan/discussions)
- **Documentation**: See [CLAUDE.md](./CLAUDE.md)

## License

MIT

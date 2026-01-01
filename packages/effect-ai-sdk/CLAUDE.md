# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test, and Development Commands

All commands use **Bun** as the package manager.

```bash
# Install dependencies (from root)
cd /Users/paul/Projects/Trinity/McLuhan
bun install

# Type checking (strict mode)
bun run --filter effect-ai-sdk typecheck

# Build
bun run --filter effect-ai-sdk build

# Testing
bun run --filter effect-ai-sdk test
bun run --filter effect-ai-sdk test:watch

# Code quality (using Biome with Ultracite preset)
bun run --filter effect-ai-sdk format:fix
bun run --filter effect-ai-sdk lint
```

## Architecture Overview

**effect-ai-sdk** is an Effect-native wrapper around Vercel AI SDK v5, providing type-safe, composable AI operations with support for 8+ AI providers (OpenAI, Anthropic, Google, Groq, DeepSeek, Perplexity, xAI, Qwen).

**Key Distinction:** This package uses a **functional library pattern** rather than Effect.Service. It provides utility functions that return `Effect.Effect<T, E>`, similar to how Effect Platform wraps Node.js APIs. This allows maximum flexibility for consumers to create their own service wrappers if needed.

### Core Modules

**src/core/operations.ts** — Core AI operations
- `generateText()` - Text generation
- `generateObject()` - Structured output
- `generateEmbeddings()` - Vector embeddings
- `generateImages()` - Image generation
- `generateAudio()` - Speech synthesis
- `transcribeAudio()` - Audio transcription

All return `Effect.Effect<EffectiveResponse<T>, AiSdkOperationError>`

**src/providers/factory.ts** — Provider factory
- `createProvider()` - Instantiate providers
- `getLanguageModel()` - Get language model from provider
- `getEmbeddingModel()` - Get embedding model
- Supports: OpenAI, Anthropic, Google, Groq, DeepSeek, Perplexity, xAI, Qwen

**src/streaming/** — Streaming operations
- `streamText()` - Stream text generation
- `streamObject()` - Stream structured output
- Provider-specific adapters (OpenAI, Anthropic)
- Unified event system

**src/tools/** — Tool calling system
- `defineTool()` - Define tool with schema
- `runTools()` - Execute tool orchestration loops
- Support for Zod, Effect.Schema, and JSON Schema
- Built-in: `fetchContent` tool (with Effect.Schema)
- Tool schema conversion to JSON Schema

**src/types/** — Type definitions
- `core.ts` - Response types, usage, finish reasons
- `inputs.ts` - Input options for operations
- `messages.ts` - EffectiveMessage and transformation utilities
- `results.ts` - Result types for all operations

**src/schema.ts** — Schema conversion utilities
- `toZodSchema()` - Effect.Schema → Zod (for tool validation only)
- `toStandardSchema()` - Effect.Schema → Standard Schema
- `validateWithSchema()` - Validation helper
- `encodeWithSchema()` - Encoding helper

**src/errors.ts** — Error types
- `AiSdkError` - Base error
- `AiSdkOperationError` - Operation failures
- `AiSdkProviderError` - Provider-specific errors
- `AiSdkConfigError` - Configuration issues
- `AiSdkSchemaError` - Schema errors
- `AiSdkMessageTransformError` - Message conversion errors

**src/agent-runner.ts** — Agent runner interface
- Abstract interface for AI agent orchestration
- Methods: `run()`, `stream()`
- Error type: `AgentRunnerError`

### Message Transformation

**Key Feature:** Bidirectional transformation between Effect messages and Vercel messages

```typescript
// Convert Effect → Vercel
export function toVercelMessage(message: Message): Effect.Effect<CoreMessage>
export function toVercelMessages(messages: Chunk<Message>): Effect.Effect<CoreMessage[]>

// Convert Vercel → Effect
export function toEffectiveMessage(coreMessage: CoreMessage, modelId: string): Effect.Effect<Message>
export function toEffectiveMessages(messages: CoreMessage[], modelId: string): Effect.Effect<Chunk<Message>>
```

**Message Parts:**
- `TextPart` - Text content
- `ToolCallPart` - Function calls
- `ToolPart` - Tool results
- `ImageUrlPart` - Image references

## Supported AI Providers

| Provider | Language Model | Embedding | Images | Audio |
|----------|---|---|---|---|
| OpenAI | ✅ | ✅ | ✅ | ✅ |
| Anthropic | ✅ | ❌ | ❌ | ❌ |
| Google (Gemini) | ✅ | ✅ | ❌ | ❌ |
| Groq | ✅ | ❌ | ❌ | ❌ |
| DeepSeek | ✅ | ❌ | ❌ | ❌ |
| Perplexity | ✅ | ❌ | ❌ | ❌ |
| xAI (Grok) | ✅ | ❌ | ❌ | ❌ |
| Qwen (Alibaba) | ✅ | ❌ | ❌ | ❌ |

## Global Model Types (types/models.ts)

**New in v5.0.117+:** Comprehensive type definitions for all supported providers and models.

### Type-Safe Provider and Model Selection

```typescript
import type {
  SupportedProvider,
  SupportedLanguageModel,
  OpenAIModel,
  AnthropicModel,
  ProviderModelMap,
} from "effect-ai-sdk"
import { isSupportedModel, PROVIDER_MODELS, PROVIDER_CAPABILITIES } from "effect-ai-sdk"

// Type-safe provider selection
const provider: SupportedProvider = "openai"

// Type-safe model selection
const model: OpenAIModel = "gpt-5o"

// Check if combination is supported
if (isSupportedModel("openai", "gpt-4o")) {
  // Safe to use
}

// Get all models for a provider
const openaiModels = PROVIDER_MODELS.openai // ["gpt-5o", "gpt-4o", "gpt-4-turbo", ...]

// Check provider capabilities
const caps = PROVIDER_CAPABILITIES.openai
console.log(caps.streaming) // true
console.log(caps.vision) // true
```

### Available Models by Provider

**OpenAI** (`OpenAIModel`)
- `gpt-5o` - Latest GPT-5 Omni model (128K context, 4K output)
- `gpt-4o` - Latest GPT-4 Omni model (128K context, 4K output)
- `gpt-4-turbo` - Previous generation turbo (128K context, 4K output)
- `gpt-4` - Original GPT-4 (8K context, 8K output)
- `gpt-3.5-turbo` - Legacy fast model (16K context, 4K output)

**Anthropic** (`AnthropicModel`)
- `claude-3-5-sonnet-20241022` - Latest Sonnet model
- `claude-3-opus-20240229` - Most capable model
- `claude-3-sonnet-20240229` - Balanced model
- `claude-3-haiku-20240307` - Fastest model

**Google** (`GoogleModel`)
- `gemini-2.0-flash` - Latest Flash model (1M context)
- `gemini-1.5-pro` - High-capability model (1M context)
- `gemini-1.5-flash` - Fast model (1M context)
- `gemini-1.0-pro` - Previous generation model

**Groq** (`GroqModel`)
- `mixtral-8x7b-32768` - Mixture of experts
- `llama2-70b-4096` - Meta's Llama 2 70B
- `gemma-7b-it` - Google's lightweight model

**DeepSeek** (`DeepSeekModel`)
- `deepseek-coder` - Code generation specialist
- `deepseek-chat` - General-purpose chat

**Perplexity** (`PerplexityModel`)
- `pplx-70b-online` - 70B with real-time web access
- `pplx-7b-online` - 7B with real-time web access
- `pplx-70b-chat` - Offline 70B chat
- `pplx-7b-chat` - Offline 7B chat

**xAI** (`XaiModel`)
- `grok-2` - Latest Grok reasoning model
- `grok-1` - Previous generation Grok

**Qwen** (`QwenModel`)
- `qwen-turbo` - Fast Qwen model
- `qwen-plus` - Balanced Qwen model
- `qwen-max` - Most capable Qwen model

### Provider Capabilities Matrix

```typescript
import { PROVIDER_CAPABILITIES } from "effect-ai-sdk"

// Check what a provider supports
const openaiCaps = PROVIDER_CAPABILITIES.openai
console.log(openaiCaps.streaming) // true
console.log(openaiCaps.vision) // true
console.log(openaiCaps.toolCalling) // true
console.log(openaiCaps.maxInputTokens) // 128000

// Compare providers
const anthropicCaps = PROVIDER_CAPABILITIES.anthropic
console.log(anthropicCaps.embedding) // false - Anthropic doesn't support embeddings
```

### Provider Comparison and Selection

```typescript
import { PROVIDER_COMPARISON } from "effect-ai-sdk"

// Find providers by use case
PROVIDER_COMPARISON.lowestLatency // ["groq"]
PROVIDER_COMPARISON.bestReasoning // ["openai", "anthropic", "google"]
PROVIDER_COMPARISON.largestContext // ["google", "qwen"]
PROVIDER_COMPARISON.withVision // ["openai", "anthropic", "google"]
PROVIDER_COMPARISON.withToolCalling // ["openai", "anthropic", ...]
PROVIDER_COMPARISON.mostAffordable // ["groq", "qwen"]
```

### Provider Configuration

```typescript
import { PROVIDER_AUTH_CONFIG, PROVIDER_BASE_URLS } from "effect-ai-sdk"

// Get authentication requirements
const authConfig = PROVIDER_AUTH_CONFIG.openai
console.log(authConfig.apiKeyEnvVar) // "OPENAI_API_KEY"
console.log(authConfig.supportsOrganization) // true
console.log(authConfig.requiredEnvVars) // ["OPENAI_API_KEY"]

// Get provider base URLs
const baseUrl = PROVIDER_BASE_URLS.deepseek // "https://api.deepseek.com"
```

## Zod Usage Policy

**Important:** Zod is used ONLY for tool validation, not general schema conversion.

**Allowed Usage:**
- ✅ Tool schema conversion in `src/tools/schema.ts`
- ✅ Tool parameter validation via `parseToolArguments()`
- ✅ Zod schema type definitions in tool types

**Restricted Usage:**
- ❌ General schema conversion (use Effect.Schema instead)
- ❌ API request validation (use Effect.Schema only)
- ❌ Domain model validation (use Effect.Schema only)

**Rationale:** Effect.Schema is the preferred validation library for this codebase. Zod is only present for compatibility with tools that may require it.

## Code Quality & Standards

**Code Formatter:** Biome with Ultracite preset
- Run `bun run --filter effect-ai-sdk format:fix` to auto-fix formatting

**TypeScript Configuration:**
- Target: ES2022
- Module: ESNext
- Strict mode enabled
- `exactOptionalPropertyTypes: true` (strict optional handling)
- Module resolution: Bundler

**Import Patterns:**
```typescript
// Effect - namespace imports
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { Data } from "effect"; // OK as named import

// Internal - absolute paths with .js extension (ESM)
import { MemoriesService } from "@effect-supermemory/services/MemoriesService/service.js";

// Third-party - as needed
import { generateText as vercelGenerateText } from "ai";
import { z } from "zod"; // Only for tools/
```

**Naming Conventions:**
- Functions: camelCase (e.g., `generateText`)
- Types: PascalCase (e.g., `EffectiveResponse`)
- Error classes: PascalCase + Error suffix (e.g., `AiSdkOperationError`)
- Files: lowercase (e.g., `operations.ts`, `factory.ts`)
- Interfaces: PascalCase + Api suffix (if needed)

## Testing

**Test Framework:** Vitest

**Current Test Coverage:**
- `test/errors.test.ts` - Error type tests
- `test/smoke.test.ts` - Export smoke tests

**Running Tests:**
```bash
bun run --filter effect-ai-sdk test           # Run once
bun run --filter effect-ai-sdk test:watch     # Watch mode
```

**Testing Pattern:**
```typescript
import { describe, it, expect } from "vitest";
import * as Effect from "effect/Effect";
import { generateText } from "../src/core/operations";

describe("generateText", () => {
  it("generates text successfully", async () => {
    // Test implementation
  });
});
```

**Note:** Test API keys can be set via environment variables (OPENAI_API_KEY, etc.)

## Key Implementation Details

### 1. Effect Usage Pattern
All operations return `Effect.Effect<T, E>` for composability:

```typescript
const program = Effect.gen(function* () {
  const provider = yield* createProvider("openai", config);
  const model = yield* getLanguageModel(provider, "gpt-4");
  const result = yield* generateText(model, { text: "Hello!" });
  return result.data.text;
});

const text = await Effect.runPromise(program);
```

### 2. Error Handling
Discriminated error types via `Data.TaggedError`:

```typescript
const result = Effect.catchTag('AiSdkOperationError', (err) => {
  // Handle operation errors specifically
});
```

### 3. Provider Configuration
Configure at provider creation time:

```typescript
const provider = yield* createProvider("openai", {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
  organization: "org-123",
});
```

### 4. Message Transformation
Automatic conversion between formats:

```typescript
// Effect → Vercel
const vercelMessage = yield* toVercelMessage(effectiveMessage);

// Vercel → Effect
const effectiveMessage = yield* toEffectiveMessage(coreMessage, "gpt-4");
```

### 5. Tool Definition
Define tools with Zod or Effect.Schema:

```typescript
// Using Zod
const myTool = defineTool({
  name: "my-tool",
  description: "My tool",
  schema: z.object({ input: z.string() }),
  handler: async (args) => ({ result: args.input }),
});

// Using Effect.Schema
const mySchema = Schema.Struct({ input: Schema.String });
const myTool = defineTool({
  name: "my-tool",
  description: "My tool",
  schema: mySchema,
  handler: async (args) => ({ result: args.input }),
});
```

## Integration with Other McLuhan Packages

**effect-supermemory:**
- effect-ai-sdk can generate embeddings to store in memory
- Messages can be persisted as memories
- Semantic search on past conversations

**effect-cli-tui:**
- Interactive prompts powered by effect-ai-sdk
- Display streaming AI responses
- Tool call visualization

**effect-actor:**
- AI-powered state transitions
- Tool calls as actions in statecharts
- Message history as context

## Known Issues and Limitations

### TypeScript Strict Configuration
The package has `exactOptionalPropertyTypes: true` which causes strict type checking with Vercel AI SDK interfaces. This is intentional for type safety but may require explicit handling of optional parameters.

### Schema Conversion Limitations
- `toZodSchema()` currently returns `z.any()` as a placeholder
- Full Effect.Schema → Zod conversion would require AST introspection
- **Recommendation:** Use schemas in their native format when possible

### Streaming Support
- OpenAI and Anthropic providers have full streaming support
- Other providers may have limited or no streaming capability

### Security Updates
- **CVE-2025-48985 (Fixed in v5.0.52):** Input validation bypass in prompt conversion
- All users should update to v5.0.52+ immediately

### Version Pinning
- Using caret ranges (`^5.0.109`) for patch/minor updates
- Provider packages pinned to v1.x for stability
- Manual review required before major version updates

## Future Enhancements

1. **Comprehensive Test Suite** - Unit tests for all operations
2. **Additional Providers** - Mistral, Cohere, Replicate, Together AI
3. **Service Wrapper** - Optional AiService class if service pattern is needed
4. **Full Schema Conversion** - Complete Effect.Schema ↔ Zod conversion
5. **Streaming Support** - Add streaming for all providers

## Performance Considerations

- **Streaming:** Prefer streaming operations for large outputs
- **Batching:** Use `generateEmbeddings()` for multiple texts (batch operation)
- **Model Selection:** Choose appropriate model size for use case
- **Error Handling:** Implement retry logic for transient failures

## Security Considerations

- **API Keys:** Never commit API keys; use environment variables
- **Input Validation:** Validate user inputs before passing to AI
- **Output Sanitization:** Sanitize AI outputs before displaying to users
- **Rate Limiting:** Implement rate limiting for API calls
- **Token Limits:** Monitor token usage to prevent unexpected costs

## Contributing

When adding new features:

1. Follow the existing module structure
2. Add comprehensive JSDoc comments
3. Return `Effect.Effect<T, E>` from all operations
4. Use discriminated errors (`Data.TaggedError`)
5. Add tests in `test/` directory
6. Update CLAUDE.md with new capabilities

## Version History

### Current Versions (as of 2025-12-10)
- **Vercel AI SDK:** v5.0.109 (includes CVE-2025-48985 security fix)
- **Provider Packages:** v1.x (stable)
- **@ai-sdk/provider:** v2.0.0 (v2 spec required for AI SDK 5)

### Update History
- **2025-12-10:** Updated from v5.0.0 to v5.0.109
  - Security fix: CVE-2025-48985 (input validation bypass)
  - Bug fixes: streaming, error handling, abort signals
  - Improved type safety for message parts

### Known Compatibility Notes
- Provider packages v2.x available but not yet adopted (breaking changes)
- Zod v4 available but staying on v3.x (tool compatibility)
- Effect.Schema preferred over Zod for new features

## References

- **Effect.ts:** https://effect.website
- **Vercel AI SDK:** https://ai.vercel.com
- **Effect Language Service:** TypeScript plugin for IDE support

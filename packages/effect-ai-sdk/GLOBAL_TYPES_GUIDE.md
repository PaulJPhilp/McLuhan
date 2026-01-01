# Global Model and Provider Types Guide

## Overview

This guide explains the comprehensive global type system for effect-ai-sdk that defines all supported providers and models. These types provide compile-time safety and IDE autocomplete for provider and model selection.

**File:** `src/types/models.ts`
**Exports:** Available from the main `effect-ai-sdk` package
**Version:** v5.0.117+

## Quick Start

### Type-Safe Provider Selection

```typescript
import type { SupportedProvider } from "effect-ai-sdk"

// Type-safe provider variable
const provider: SupportedProvider = "openai"  // ✅ Correct
const invalid: SupportedProvider = "mistral"  // ❌ TypeScript error
```

### Type-Safe Model Selection

```typescript
import type { OpenAIModel, AnthropicModel, SupportedLanguageModel } from "effect-ai-sdk"

// Provider-specific model types
const gptModel: OpenAIModel = "gpt-5o"           // ✅ Valid OpenAI model
const claudeModel: AnthropicModel = "claude-3-5-sonnet-20241022"  // ✅ Valid Anthropic model

// Universal model type
const anyModel: SupportedLanguageModel = "gpt-5o"  // ✅ Can accept any supported model
```

### Runtime Validation

```typescript
import { isSupportedModel, PROVIDER_MODELS } from "effect-ai-sdk"

// Check if a model is supported by a provider
if (isSupportedModel("openai", "gpt-4o")) {
  // Safe to use this model with this provider
}

// Get all models for a provider
const allGoogleModels = PROVIDER_MODELS.google
// ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"]
```

## Type Definitions Reference

### Provider Types

#### `SupportedProvider`
Union type of all supported AI provider names.

```typescript
type SupportedProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "deepseek"
  | "perplexity"
  | "xai"
  | "qwen"
  | "gateway"
```

### Model Types

#### Language Models

```typescript
// Provider-specific types
type OpenAIModel = "gpt-5o" | "gpt-4o" | "gpt-4-turbo" | "gpt-4" | "gpt-3.5-turbo"
type AnthropicModel = "claude-3-5-sonnet-20241022" | "claude-3-opus-20240229" | ...
type GoogleModel = "gemini-2.0-flash" | "gemini-1.5-pro" | ...
type GroqModel = "mixtral-8x7b-32768" | "llama2-70b-4096" | "gemma-7b-it"
type DeepSeekModel = "deepseek-coder" | "deepseek-chat"
type PerplexityModel = "pplx-70b-online" | "pplx-7b-online" | ...
type XaiModel = "grok-2" | "grok-1"
type QwenModel = "qwen-turbo" | "qwen-plus" | "qwen-max"

// Universal type accepting any supported language model
type SupportedLanguageModel =
  | OpenAIModel
  | AnthropicModel
  | GoogleModel
  | GroqModel
  | DeepSeekModel
  | PerplexityModel
  | XaiModel
  | QwenModel
```

#### Other Modalities

```typescript
type SupportedEmbeddingModel = "text-embedding-3-large" | "text-embedding-3-small" | ...
type SupportedImageModel = "dall-e-3" | "dall-e-2"
type SupportedAudioModel = "tts-1-hd" | "tts-1" | "whisper-1"
type SupportedModel = SupportedLanguageModel | SupportedEmbeddingModel | ...
```

### Data Structures

#### `ProviderCapabilities`

Interface describing what a provider supports.

```typescript
interface ProviderCapabilities {
  readonly languageModel: boolean
  readonly embedding: boolean
  readonly imageGeneration: boolean
  readonly audioGeneration: boolean
  readonly audioTranscription: boolean
  readonly toolCalling: boolean
  readonly streaming: boolean
  readonly vision: boolean
  readonly maxInputTokens: number
  readonly maxOutputTokens: number
}
```

#### `ProviderModelMap`

Maps each provider to its specific model type.

```typescript
interface ProviderModelMap {
  readonly openai: OpenAIModel
  readonly anthropic: AnthropicModel
  readonly google: GoogleModel
  readonly groq: GroqModel
  readonly deepseek: DeepSeekModel
  readonly perplexity: PerplexityModel
  readonly xai: XaiModel
  readonly qwen: QwenModel
  readonly gateway: GatewayModel
}
```

#### `ProviderAuthConfig`

Configuration requirements for each provider.

```typescript
interface ProviderAuthConfig {
  readonly apiKeyEnvVar: string
  readonly supportsOrganization: boolean
  readonly supportsProject: boolean
  readonly supportsCustomBaseUrl: boolean
  readonly requiredEnvVars: readonly string[]
  readonly optionalEnvVars: readonly string[]
}
```

## Runtime Constants

### `PROVIDER_MODELS`

All supported models for each provider.

```typescript
const PROVIDER_MODELS: Record<SupportedProvider, readonly string[]> = {
  openai: ["gpt-5o", "gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20241022", ...],
  google: ["gemini-2.0-flash", "gemini-1.5-pro", ...],
  groq: ["mixtral-8x7b-32768", "llama2-70b-4096", "gemma-7b-it"],
  deepseek: ["deepseek-coder", "deepseek-chat"],
  perplexity: ["pplx-70b-online", "pplx-7b-online", ...],
  xai: ["grok-2", "grok-1"],
  qwen: ["qwen-turbo", "qwen-plus", "qwen-max"],
  gateway: [],
}
```

### `PROVIDER_CAPABILITIES`

Capabilities for each provider.

```typescript
const PROVIDER_CAPABILITIES: Record<SupportedProvider, ProviderCapabilities> = {
  openai: {
    languageModel: true,
    embedding: true,
    imageGeneration: true,
    audioGeneration: true,
    audioTranscription: true,
    toolCalling: true,
    streaming: true,
    vision: true,
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
  },
  // ... other providers
}
```

### `PROVIDER_BASE_URLS`

Default API endpoints for each provider.

```typescript
const PROVIDER_BASE_URLS: Record<SupportedProvider, string | null> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  google: null,
  groq: "https://api.groq.com/openai/v1",
  deepseek: "https://api.deepseek.com",
  perplexity: "https://api.perplexity.ai",
  xai: "https://api.x.ai/v1",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  gateway: null,
}
```

### `PROVIDER_AUTH_CONFIG`

Authentication configuration for each provider.

```typescript
const PROVIDER_AUTH_CONFIG: Record<SupportedProvider, ProviderAuthConfig> = {
  openai: {
    apiKeyEnvVar: "OPENAI_API_KEY",
    supportsOrganization: true,
    supportsProject: true,
    supportsCustomBaseUrl: true,
    requiredEnvVars: ["OPENAI_API_KEY"],
    optionalEnvVars: ["OPENAI_ORG_ID", "OPENAI_PROJECT_ID"],
  },
  // ... other providers
}
```

### `PROVIDER_COMPARISON`

Quick reference for comparing providers by use case.

```typescript
const PROVIDER_COMPARISON = {
  lowestLatency: ["groq"],
  bestReasoning: ["openai", "anthropic", "google"],
  mostAffordable: ["groq", "qwen"],
  largestContext: ["google", "qwen"],
  withVision: ["openai", "anthropic", "google"],
  withToolCalling: ["openai", "anthropic", "google", "groq", "deepseek", "xai", "qwen"],
  withStreaming: ["openai", "anthropic", "google", "groq", "deepseek", "perplexity", "xai", "qwen"],
}
```

## Utility Functions

### `isSupportedModel(provider, model): boolean`

Type-safe check if a model is supported by a provider.

```typescript
import { isSupportedModel } from "effect-ai-sdk"

if (isSupportedModel("openai", "gpt-4o")) {
  // Safe to use
}

if (!isSupportedModel("anthropic", "gpt-4o")) {
  console.log("GPT-4o is not supported by Anthropic")
}
```

## Usage Examples

### Example 1: Safe Provider and Model Selection

```typescript
import type { SupportedProvider } from "effect-ai-sdk"
import { isSupportedModel, createProvider, getLanguageModel } from "effect-ai-sdk"
import { Effect } from "effect"

const provider: SupportedProvider = "openai"
const model = "gpt-5o"

const program = Effect.gen(function* () {
  // Check if combination is valid
  if (!isSupportedModel(provider, model)) {
    return yield* Effect.fail(
      new Error(`${model} is not supported by ${provider}`)
    )
  }

  // Create provider and model
  const prov = yield* createProvider(provider, {
    apiKey: process.env.OPENAI_API_KEY!,
  })

  const langModel = yield* getLanguageModel(prov, model)
  return langModel
})
```

### Example 2: Dynamic Provider Selection Based on Capabilities

```typescript
import { PROVIDER_CAPABILITIES, PROVIDER_MODELS } from "effect-ai-sdk"
import type { SupportedProvider } from "effect-ai-sdk"

function selectProviderForTask(requireVision: boolean, requireStreaming: boolean) {
  const providers: SupportedProvider[] = [
    "openai",
    "anthropic",
    "google",
    "groq",
    "deepseek",
    "perplexity",
    "xai",
    "qwen",
  ]

  const suitable = providers.filter((provider) => {
    const caps = PROVIDER_CAPABILITIES[provider]
    if (requireVision && !caps.vision) return false
    if (requireStreaming && !caps.streaming) return false
    return true
  })

  return suitable[0] // Return first suitable provider
}

// Example: Need vision and streaming
const provider = selectProviderForTask(true, true)
// Returns "openai" (first provider with both capabilities)
```

### Example 3: Finding Models by Provider

```typescript
import { PROVIDER_MODELS } from "effect-ai-sdk"

// Get all OpenAI models
console.log(PROVIDER_MODELS.openai)
// ["gpt-5o", "gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]

// Find fastest Groq model
console.log(PROVIDER_MODELS.groq[0]) // "mixtral-8x7b-32768"
```

### Example 4: Checking Provider Configuration

```typescript
import { PROVIDER_AUTH_CONFIG, PROVIDER_BASE_URLS } from "effect-ai-sdk"

const config = PROVIDER_AUTH_CONFIG.openai
console.log(`Set ${config.apiKeyEnvVar} environment variable`)
console.log(`Supports organization: ${config.supportsOrganization}`)

const baseUrl = PROVIDER_BASE_URLS.openai
console.log(`Base URL: ${baseUrl}`)
```

## Provider Details

### OpenAI
- **Best for:** Latest models, vision, tool calling, audio
- **Models:** gpt-5o, gpt-4o, gpt-4-turbo, gpt-4, gpt-3.5-turbo
- **Capabilities:** Everything
- **Cost:** Moderate to high
- **Latency:** Low to moderate
- **Context:** 128K tokens

### Anthropic
- **Best for:** Long context, reasoning
- **Models:** claude-3-5-sonnet, claude-3-opus, claude-3-sonnet, claude-3-haiku
- **Capabilities:** Language, vision, tool calling
- **Cost:** Moderate
- **Latency:** Moderate
- **Context:** 200K tokens

### Google
- **Best for:** Large context, embeddings
- **Models:** gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash
- **Capabilities:** Language, vision, embeddings, tool calling
- **Cost:** Low to moderate
- **Latency:** Moderate
- **Context:** 1M tokens

### Groq
- **Best for:** Speed, cost
- **Models:** mixtral-8x7b, llama2-70b, gemma-7b
- **Capabilities:** Language, tool calling
- **Cost:** Very low
- **Latency:** **Very low** (fastest)
- **Context:** Limited (8K-32K)

### DeepSeek
- **Best for:** Code generation
- **Models:** deepseek-coder, deepseek-chat
- **Capabilities:** Language, tool calling
- **Cost:** Very low
- **Latency:** Moderate
- **Context:** 4K tokens

### Perplexity
- **Best for:** Web search integration
- **Models:** pplx-70b-online, pplx-7b-online
- **Capabilities:** Language, streaming
- **Cost:** Low
- **Latency:** Moderate
- **Context:** 8K tokens

### xAI (Grok)
- **Best for:** Reasoning
- **Models:** grok-2, grok-1
- **Capabilities:** Language, tool calling
- **Cost:** Moderate
- **Latency:** Moderate
- **Context:** 128K tokens

### Qwen
- **Best for:** Large context, Asian languages
- **Models:** qwen-turbo, qwen-plus, qwen-max
- **Capabilities:** Language, tool calling
- **Cost:** Very low
- **Latency:** Moderate
- **Context:** 131K tokens

### Gateway
- **Best for:** Multi-provider routing
- **Models:** Any (dynamic)
- **Capabilities:** All (via routing)
- **Cost:** Depends on underlying provider
- **Latency:** Depends on underlying provider

## Testing

The global types are fully integrated and tested:

```bash
# Build the package with new types
bun run --filter effect-ai-sdk build

# Type check
bun run --filter effect-ai-sdk typecheck

# Run tests
bun run --filter effect-ai-sdk test
```

All types are exported from the main package and available to consumers.

## Migration Guide

If you're upgrading from an older version without these types:

### Before (Without Type Safety)
```typescript
const provider = "openai"  // string, no autocomplete
const model = "gpt-4o"      // string, no validation
```

### After (With Type Safety)
```typescript
import type { SupportedProvider, OpenAIModel } from "effect-ai-sdk"

const provider: SupportedProvider = "openai"  // autocomplete, validated
const model: OpenAIModel = "gpt-4o"           // autocomplete, validated
```

## Future Enhancements

Planned additions to the global types:

- [ ] Provider pricing information
- [ ] Token limits per model
- [ ] Supported regions per provider
- [ ] Rate limit information
- [ ] Deprecation notices for older models
- [ ] Beta model indicators

## References

- [Effect.ts Documentation](https://effect.website)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic Claude Docs](https://docs.anthropic.com)
- [Google Gemini Docs](https://ai.google.dev)
- [Vercel AI SDK](https://ai.vercel.com)

# Using effect-ai-sdk Global Types - Agent Guide

This guide explains how to use the new global type system in effect-ai-sdk for type-safe AI provider and model selection.

## Quick Start: The Three Core Patterns

### Pattern 1: Type-Safe Provider Selection

```typescript
import type { SupportedProvider } from "effect-ai-sdk"

// ✅ Correct - Type-safe provider
const provider: SupportedProvider = "openai"

// ❌ Fails at compile time - Type error
const invalid: SupportedProvider = "mistral"
```

**Supported Providers:**
- `"openai"` - GPT models (gpt-5o, gpt-4o, gpt-4-turbo, gpt-4, gpt-3.5-turbo)
- `"anthropic"` - Claude models (claude-3-5-sonnet, claude-3-opus, claude-3-sonnet, claude-3-haiku)
- `"google"` - Gemini models (gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash)
- `"groq"` - Fast models (mixtral-8x7b, llama2-70b, gemma-7b)
- `"deepseek"` - Code-focused (deepseek-coder, deepseek-chat)
- `"perplexity"` - Web-enabled (pplx-70b-online, pplx-7b-online, pplx-70b-chat, pplx-7b-chat)
- `"xai"` - Grok reasoning (grok-2, grok-1)
- `"qwen"` - Alibaba models (qwen-turbo, qwen-plus, qwen-max)
- `"gateway"` - Multi-provider router (dynamic)

### Pattern 2: Type-Safe Model Selection

```typescript
import type { OpenAIModel, AnthropicModel, SupportedLanguageModel } from "effect-ai-sdk"

// ✅ Provider-specific model (compile-time validated)
const gptModel: OpenAIModel = "gpt-5o"

// ✅ Another provider
const claudeModel: AnthropicModel = "claude-3-5-sonnet-20241022"

// ✅ Universal model type (accepts any supported model)
const anyModel: SupportedLanguageModel = "gpt-5o"

// ❌ Fails - Wrong model for provider
const invalid: OpenAIModel = "claude-3-opus-20240229"
```

### Pattern 3: Runtime Validation

```typescript
import { isSupportedModel, PROVIDER_MODELS, PROVIDER_CAPABILITIES } from "effect-ai-sdk"

// Check if combination is supported
if (isSupportedModel("openai", "gpt-4o")) {
  // Safe to use
}

// Get all models for a provider
const allGoogleModels = PROVIDER_MODELS.google
// ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"]

// Check provider capabilities
const openaiCaps = PROVIDER_CAPABILITIES.openai
if (openaiCaps.streaming && openaiCaps.vision) {
  // OpenAI supports both streaming and vision
}
```

## Real-World Examples

### Example 1: Safe Provider and Model Selection

```typescript
import type { SupportedProvider, OpenAIModel } from "effect-ai-sdk"
import { isSupportedModel, createProvider, getLanguageModel } from "effect-ai-sdk"
import * as Effect from "effect/Effect"

const provider: SupportedProvider = "openai"
const model: OpenAIModel = "gpt-5o"

const program = Effect.gen(function* () {
  // Compile-time safety ensures this combination is valid
  if (!isSupportedModel(provider, model)) {
    return yield* Effect.fail(new Error(`Invalid combination: ${provider}/${model}`))
  }

  const prov = yield* createProvider(provider, {
    apiKey: process.env.OPENAI_API_KEY!,
  })

  const langModel = yield* getLanguageModel(prov, model)
  return langModel
})
```

### Example 2: Select Provider by Capabilities

```typescript
import { PROVIDER_CAPABILITIES } from "effect-ai-sdk"
import type { SupportedProvider } from "effect-ai-sdk"

function selectProviderForVision(): SupportedProvider {
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

  const withVision = providers.filter(
    (p) => PROVIDER_CAPABILITIES[p].vision
  )

  return withVision[0] // Returns "openai" (first with vision)
}

// Get provider that supports both streaming and tool calling
function selectProviderForToolCallingAndStreaming(): SupportedProvider {
  const providers: SupportedProvider[] = [
    "openai",
    "anthropic",
    "google",
    "groq",
  ]

  return providers.find((p) => {
    const caps = PROVIDER_CAPABILITIES[p]
    return caps.streaming && caps.toolCalling
  })! // OpenAI or Anthropic
}
```

### Example 3: Choose Model by Use Case

```typescript
import { PROVIDER_MODELS, PROVIDER_COMPARISON } from "effect-ai-sdk"

// Find the fastest provider
const fastest = PROVIDER_COMPARISON.lowestLatency[0] // "groq"
const fastModel = PROVIDER_MODELS.groq[0] // "mixtral-8x7b-32768"

// Find best reasoning providers
const reasoningProviders = PROVIDER_COMPARISON.bestReasoning
// ["openai", "anthropic", "google"]

// Find most affordable
const cheapProviders = PROVIDER_COMPARISON.mostAffordable
// ["groq", "qwen"]

// Find largest context window
const contextProviders = PROVIDER_COMPARISON.largestContext
// ["google", "qwen"]

// Use in code
function selectModelForReasoning() {
  // Choose first reasoning provider's best model
  const provider = PROVIDER_COMPARISON.bestReasoning[0] // "openai"
  const model = PROVIDER_MODELS[provider][0] // "gpt-5o"
  return { provider, model }
}
```

### Example 4: Dynamic Configuration

```typescript
import { PROVIDER_AUTH_CONFIG, PROVIDER_BASE_URLS } from "effect-ai-sdk"
import type { SupportedProvider } from "effect-ai-sdk"

function configureProvider(provider: SupportedProvider) {
  const authConfig = PROVIDER_AUTH_CONFIG[provider]
  const baseUrl = PROVIDER_BASE_URLS[provider]

  console.log(`Provider: ${provider}`)
  console.log(`API Key Env: ${authConfig.apiKeyEnvVar}`)
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Required Env Vars: ${authConfig.requiredEnvVars.join(", ")}`)
  console.log(`Supports Organization: ${authConfig.supportsOrganization}`)

  // Validate required environment variables
  const missingVars = authConfig.requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  )

  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(", ")}`)
  }

  return {
    apiKey: process.env[authConfig.apiKeyEnvVar]!,
    baseURL: baseUrl,
    organization: process.env.ORGANIZATION_ID,
  }
}
```

## Type Reference

### Provider Types

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

```typescript
// Provider-specific model unions
type OpenAIModel = "gpt-5o" | "gpt-4o" | "gpt-4-turbo" | "gpt-4" | "gpt-3.5-turbo"
type AnthropicModel = "claude-3-5-sonnet-20241022" | "claude-3-opus-20240229" | ...
type GoogleModel = "gemini-2.0-flash" | "gemini-1.5-pro" | "gemini-1.5-flash" | ...
type GroqModel = "mixtral-8x7b-32768" | "llama2-70b-4096" | "gemma-7b-it"
type DeepSeekModel = "deepseek-coder" | "deepseek-chat"
type PerplexityModel = "pplx-70b-online" | "pplx-7b-online" | "pplx-70b-chat" | "pplx-7b-chat"
type XaiModel = "grok-2" | "grok-1"
type QwenModel = "qwen-turbo" | "qwen-plus" | "qwen-max"

// Universal type - accepts any supported model
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

### Capability Interface

```typescript
interface ProviderCapabilities {
  readonly languageModel: boolean      // Can do text generation
  readonly embedding: boolean          // Can create embeddings
  readonly imageGeneration: boolean    // Can generate images
  readonly audioGeneration: boolean    // Can generate audio/speech
  readonly audioTranscription: boolean // Can transcribe audio
  readonly toolCalling: boolean        // Can call tools/functions
  readonly streaming: boolean          // Supports streaming responses
  readonly vision: boolean             // Can process images
  readonly maxInputTokens: number      // Max context window
  readonly maxOutputTokens: number     // Max output size
}
```

## Runtime Constants

### PROVIDER_MODELS
Maps each provider to its available models:
```typescript
PROVIDER_MODELS.openai    // ["gpt-5o", "gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]
PROVIDER_MODELS.anthropic // ["claude-3-5-sonnet-20241022", ...]
PROVIDER_MODELS.google    // ["gemini-2.0-flash", "gemini-1.5-pro", ...]
```

### PROVIDER_CAPABILITIES
Feature matrix for each provider:
```typescript
PROVIDER_CAPABILITIES.openai.streaming  // true
PROVIDER_CAPABILITIES.openai.vision     // true
PROVIDER_CAPABILITIES.groq.maxInputTokens // 32000
```

### PROVIDER_BASE_URLS
Default API endpoints:
```typescript
PROVIDER_BASE_URLS.openai    // "https://api.openai.com/v1"
PROVIDER_BASE_URLS.anthropic // "https://api.anthropic.com"
PROVIDER_BASE_URLS.groq      // "https://api.groq.com/openai/v1"
```

### PROVIDER_AUTH_CONFIG
Authentication requirements:
```typescript
PROVIDER_AUTH_CONFIG.openai.apiKeyEnvVar // "OPENAI_API_KEY"
PROVIDER_AUTH_CONFIG.openai.requiredEnvVars // ["OPENAI_API_KEY"]
PROVIDER_AUTH_CONFIG.openai.supportsOrganization // true
```

### PROVIDER_COMPARISON
Quick reference by use case:
```typescript
PROVIDER_COMPARISON.lowestLatency      // ["groq"]
PROVIDER_COMPARISON.bestReasoning      // ["openai", "anthropic", "google"]
PROVIDER_COMPARISON.mostAffordable     // ["groq", "qwen"]
PROVIDER_COMPARISON.largestContext     // ["google", "qwen"]
PROVIDER_COMPARISON.withVision         // ["openai", "anthropic", "google"]
PROVIDER_COMPARISON.withToolCalling    // ["openai", "anthropic", "google", ...]
PROVIDER_COMPARISON.withStreaming      // ["openai", "anthropic", "google", ...]
```

## Common Patterns for Agents

### Pattern: Dynamic Provider Selection Based on Input

```typescript
import { PROVIDER_COMPARISON, isSupportedModel } from "effect-ai-sdk"
import type { SupportedProvider, SupportedLanguageModel } from "effect-ai-sdk"

function selectProviderForTask(requirements: {
  needsVision?: boolean
  needsStreaming?: boolean
  needsToolCalling?: boolean
  needsFastSpeed?: boolean
  needsCheapCost?: boolean
  needsLargeContext?: boolean
}): SupportedProvider {
  let candidates: SupportedProvider[] = [
    "openai",
    "anthropic",
    "google",
    "groq",
    "deepseek",
    "perplexity",
    "xai",
    "qwen",
  ]

  if (requirements.needsFastSpeed) {
    candidates = PROVIDER_COMPARISON.lowestLatency
  }

  if (requirements.needsCheapCost) {
    candidates = PROVIDER_COMPARISON.mostAffordable
  }

  if (requirements.needsLargeContext) {
    candidates = PROVIDER_COMPARISON.largestContext
  }

  if (requirements.needsVision) {
    candidates = candidates.filter((p) =>
      PROVIDER_COMPARISON.withVision.includes(p)
    )
  }

  if (requirements.needsStreaming) {
    candidates = candidates.filter((p) =>
      PROVIDER_COMPARISON.withStreaming.includes(p)
    )
  }

  if (requirements.needsToolCalling) {
    candidates = candidates.filter((p) =>
      PROVIDER_COMPARISON.withToolCalling.includes(p)
    )
  }

  return candidates[0] || "openai" // Fallback to OpenAI
}

// Usage
const provider = selectProviderForTask({
  needsVision: true,
  needsStreaming: true,
  needsCheapCost: false,
}) // Returns "openai"
```

### Pattern: Validate User Input

```typescript
import { isSupportedModel, PROVIDER_MODELS } from "effect-ai-sdk"
import type { SupportedProvider } from "effect-ai-sdk"

function validateUserModelChoice(
  provider: unknown,
  model: unknown
): { provider: SupportedProvider; model: string } | { error: string } {
  if (typeof provider !== "string") {
    return { error: "Provider must be a string" }
  }

  if (typeof model !== "string") {
    return { error: "Model must be a string" }
  }

  if (!isSupportedModel(provider as SupportedProvider, model)) {
    const validModels = PROVIDER_MODELS[provider as SupportedProvider]
    return {
      error: `Model "${model}" not supported by "${provider}". Valid models: ${validModels.join(", ")}`,
    }
  }

  return {
    provider: provider as SupportedProvider,
    model,
  }
}
```

### Pattern: Build Configuration from Types

```typescript
import { PROVIDER_AUTH_CONFIG } from "effect-ai-sdk"
import type { SupportedProvider } from "effect-ai-sdk"

function buildProviderConfig(provider: SupportedProvider) {
  const authConfig = PROVIDER_AUTH_CONFIG[provider]

  // Build configuration object
  const config: Record<string, string> = {
    apiKey: process.env[authConfig.apiKeyEnvVar] || "",
  }

  // Add optional environment variables if they exist
  for (const envVar of authConfig.optionalEnvVars) {
    if (process.env[envVar]) {
      config[envVar.toLowerCase()] = process.env[envVar]!
    }
  }

  // Validate required variables
  const missing = authConfig.requiredEnvVars.filter((envVar) => !process.env[envVar])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }

  return config
}
```

## Benefits for Agents

1. **Compile-Time Safety** - Catch invalid provider/model combinations before runtime
2. **IDE Autocomplete** - Get suggestions for all 40+ supported models
3. **Self-Documenting Code** - Types serve as inline documentation
4. **Prevention of Errors** - No more `AI_UnsupportedModelVersionError` surprises
5. **Easy Provider Selection** - Use PROVIDER_COMPARISON to find the right provider
6. **Capability Checking** - PROVIDER_CAPABILITIES matrix for feature detection
7. **Configuration Management** - PROVIDER_AUTH_CONFIG and PROVIDER_BASE_URLS provide all setup info

## Troubleshooting

**Q: TypeScript says "not assignable to type SupportedProvider"**
- A: Check the provider name is spelled correctly and exists in the list above

**Q: I'm getting a model validation error**
- A: Use `PROVIDER_MODELS[provider]` to see valid models, or use `isSupportedModel()` to validate

**Q: How do I use a dynamic provider name from user input?**
- A: Cast to `SupportedProvider` after validating with `isSupportedModel()`:
  ```typescript
  if (isSupportedModel(userInput as SupportedProvider, model)) {
    // Safe to use userInput as SupportedProvider
  }
  ```

## Next Steps

1. Import the types you need from "effect-ai-sdk"
2. Annotate your provider/model variables with the types
3. Let TypeScript catch errors at compile time
4. Use runtime constants for dynamic behavior
5. Check GLOBAL_TYPES_GUIDE.md for advanced examples

For more details, see `GLOBAL_TYPES_GUIDE.md` in this directory.

/**
 * @file Global type definitions for all AI providers and models supported by effect-ai-sdk
 * @module @org_name/effect-ai-model-sdk/types/models
 *
 * This module provides comprehensive type definitions for all supported AI providers
 * and their available models. It serves as the source of truth for provider/model
 * combinations and helps prevent runtime errors from unsupported model-provider pairs.
 *
 * Last updated: 2025-12-31 with AI SDK v5.0.117
 *
 * @example
 * ```typescript
 * import type { SupportedProvider, SupportedModel, ProviderModelMap } from "effect-ai-sdk"
 *
 * // Type-safe provider selection
 * const provider: SupportedProvider = "openai"
 *
 * // Type-safe model selection for OpenAI
 * const model: ProviderModelMap["openai"] = "gpt-4o"
 *
 * // All supported model-provider combinations
 * const validCombos: Array<[SupportedProvider, string]> = [
 *   ["openai", "gpt-4o"],
 *   ["anthropic", "claude-3-opus"],
 * ]
 * ```
 */

/**
 * OpenAI language models
 * Visit: https://platform.openai.com/docs/models
 *
 * Latest Release: January 2025
 * - gpt-5.2: Latest GPT-5 model with enhanced capabilities
 * - gpt-5.1: GPT-5 model with improved performance
 * - gpt-5.0: Initial GPT-5 release with advanced reasoning
 * - gpt-4o: Latest GPT-4 Omni model with vision, reasoning, and tool calling
 * - gpt-4o-mini: Smaller, faster GPT-4o model for cost-sensitive applications
 * - gpt-4-turbo: Previous generation turbo model with 128k context
 * - gpt-4: Original GPT-4 model
 * - gpt-3.5-turbo: Legacy fast model for cost-sensitive applications
 *
 * Token Limits:
 * - gpt-5.x: 128K input, 16K output (estimated)
 * - gpt-4o: 128K input, 16K output
 * - gpt-4o-mini: 128K input, 16K output
 * - gpt-4-turbo: 128K input, 4K output
 * - gpt-4: 8K input, 8K output
 * - gpt-3.5-turbo: 16K input, 4K output
 */
export type OpenAIModel =
  | "gpt-5.2"
  | "gpt-5.1"
  | "gpt-5.0"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  | "gpt-4"
  | "gpt-3.5-turbo";

/**
 * OpenAI embedding models
 * Visit: https://platform.openai.com/docs/guides/embeddings
 */
export type OpenAIEmbeddingModel =
  | "text-embedding-3-large"
  | "text-embedding-3-small"
  | "text-embedding-ada-002";

/**
 * OpenAI image generation models
 */
export type OpenAIImageModel = "dall-e-3" | "dall-e-2";

/**
 * OpenAI audio models
 */
export type OpenAIAudioModel = "tts-1-hd" | "tts-1" | "whisper-1";

/**
 * Anthropic Claude language models
 * Visit: https://docs.anthropic.com/en/docs/about-claude/models/latest
 *
 * Latest Release: December 2024
 * - claude-3-5-sonnet: Latest Sonnet model with improved reasoning
 * - claude-3-opus: Most capable model for complex tasks
 * - claude-3-sonnet: Balanced model for intelligence and speed
 * - claude-3-haiku: Fastest and most compact model
 *
 * Token Limits:
 * - claude-3-5-sonnet: 200K input, 4K output
 * - claude-3-opus: 200K input, 4K output
 * - claude-3-sonnet: 200K input, 4K output
 * - claude-3-haiku: 200K input, 4K output
 */
export type AnthropicModel =
  | "claude-3-5-sonnet-20241022"
  | "claude-3-opus-20240229"
  | "claude-3-sonnet-20240229"
  | "claude-3-haiku-20240307";

/**
 * Google Gemini language models
 * Visit: https://ai.google.dev/gemini-api/docs/models/gemini
 *
 * Latest Release: January 2025
 * - gemini-3-pro: State-of-the-art model with superior reasoning and multimodal capabilities
 * - gemini-3-flash: Cost-effective model with near-Pro capabilities, optimized for speed
 * - gemini-2.5-pro: Advanced reasoning model with enhanced coding capabilities
 * - gemini-2.5-flash: Optimized for speed and efficiency, suitable for high-volume tasks
 * - gemini-2.0-flash: Stable Flash model with multimodal support
 *
 * Token Limits:
 * - gemini-3-*: 1M input, 8K output
 * - gemini-2.5-*: 1M input, 8K output
 * - gemini-2.0-flash: 1M input, 8K output
 */
export type GoogleModel =
  | "gemini-3-pro"
  | "gemini-3-flash"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.0-flash";

/**
 * Google embedding models
 * Visit: https://ai.google.dev/gemini-2/docs/embeddings
 */
export type GoogleEmbeddingModel = "text-embedding-004" | "embedding-001";

/**
 * Groq language models (OpenAI-compatible)
 * Visit: https://console.groq.com/docs/models
 *
 * Groq specializes in fast inference with optimized hardware
 * - mixtral-8x7b-32768: Open-source mixture of experts model
 * - llama2-70b-4096: Meta's Llama 2 70B parameter model
 * - gemma-7b-it: Google's lightweight instruction-tuned model
 */
export type GroqModel =
  | "mixtral-8x7b-32768"
  | "llama2-70b-4096"
  | "gemma-7b-it";

/**
 * DeepSeek language models (OpenAI-compatible)
 * Visit: https://platform.deepseek.com/docs/models
 * Base URL: https://api.deepseek.com
 *
 * DeepSeek provides high-quality code and reasoning models
 * - deepseek-coder: Optimized for code generation and understanding
 * - deepseek-chat: General-purpose conversational model
 */
export type DeepSeekModel = "deepseek-coder" | "deepseek-chat";

/**
 * Perplexity language models (OpenAI-compatible)
 * Visit: https://docs.perplexity.ai/guides/model-cards
 * Base URL: https://api.perplexity.ai
 *
 * Perplexity models include web search capabilities
 * - pplx-70b-online: 70B parameter model with real-time web access
 * - pplx-7b-online: 7B parameter model with real-time web access
 * - pplx-70b-chat: Offline 70B chat model
 * - pplx-7b-chat: Offline 7B chat model
 */
export type PerplexityModel =
  | "pplx-70b-online"
  | "pplx-7b-online"
  | "pplx-70b-chat"
  | "pplx-7b-chat";

/**
 * xAI language models (OpenAI-compatible)
 * Visit: https://docs.x.ai/docs
 * Base URL: https://api.x.ai/v1
 *
 * xAI's Grok models with advanced reasoning
 * - grok-2: Latest xAI reasoning model
 * - grok-1: Previous generation xAI model
 */
export type XaiModel = "grok-2" | "grok-1";

/**
 * Qwen language models (OpenAI-compatible via Alibaba DashScope)
 * Visit: https://help.aliyun.com/zh/dashscope/developer-reference
 * Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
 *
 * Alibaba's Qwen models optimized for Asian languages
 * - qwen-turbo: Fast Qwen model for quick responses
 * - qwen-plus: Balanced Qwen model
 * - qwen-max: Most capable Qwen model
 */
export type QwenModel = "qwen-turbo" | "qwen-plus" | "qwen-max";

/**
 * Vercel AI Gateway models (v2 specification)
 * Visit: https://vercel.com/docs/ai-sdk-3/gateway
 *
 * Gateway provides unified interface for multiple providers
 * with advanced features like caching and routing
 */
export type GatewayModel = string; // Gateway supports dynamic model routing

/**
 * Union type of all supported language models across all providers
 */
export type SupportedLanguageModel =
  | OpenAIModel
  | AnthropicModel
  | GoogleModel
  | GroqModel
  | DeepSeekModel
  | PerplexityModel
  | XaiModel
  | QwenModel
  | GatewayModel;

/**
 * Union type of all supported embedding models
 */
export type SupportedEmbeddingModel =
  | OpenAIEmbeddingModel
  | GoogleEmbeddingModel;

/**
 * Union type of all supported image generation models
 */
export type SupportedImageModel = OpenAIImageModel;

/**
 * Union type of all supported audio models
 */
export type SupportedAudioModel = OpenAIAudioModel;

/**
 * Union type of all supported models across all modalities
 */
export type SupportedModel =
  | SupportedLanguageModel
  | SupportedEmbeddingModel
  | SupportedImageModel
  | SupportedAudioModel;

/**
 * All supported AI provider names
 */
export type SupportedProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "deepseek"
  | "perplexity"
  | "xai"
  | "qwen"
  | "gateway";

/**
 * Provider capabilities matrix
 * Indicates which modalities each provider supports
 */
export interface ProviderCapabilities {
  /** Language model (text generation) support */
  readonly languageModel: boolean;
  /** Embedding model support */
  readonly embedding: boolean;
  /** Image generation support */
  readonly imageGeneration: boolean;
  /** Audio generation (TTS) support */
  readonly audioGeneration: boolean;
  /** Audio transcription support */
  readonly audioTranscription: boolean;
  /** Tool calling support */
  readonly toolCalling: boolean;
  /** Streaming support */
  readonly streaming: boolean;
  /** Vision (image understanding) support */
  readonly vision: boolean;
  /** Maximum input token limit */
  readonly maxInputTokens: number;
  /** Maximum output token limit */
  readonly maxOutputTokens: number;
}

/**
 * Comprehensive provider capabilities matrix
 */
export const PROVIDER_CAPABILITIES: Record<
  SupportedProvider,
  ProviderCapabilities
> = {
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
  anthropic: {
    languageModel: true,
    embedding: false,
    imageGeneration: false,
    audioGeneration: false,
    audioTranscription: false,
    toolCalling: true,
    streaming: true,
    vision: true,
    maxInputTokens: 200000,
    maxOutputTokens: 4096,
  },
  google: {
    languageModel: true,
    embedding: true,
    imageGeneration: false,
    audioGeneration: false,
    audioTranscription: false,
    toolCalling: true,
    streaming: true,
    vision: true,
    maxInputTokens: 1000000,
    maxOutputTokens: 8000,
  },
  groq: {
    languageModel: true,
    embedding: false,
    imageGeneration: false,
    audioGeneration: false,
    audioTranscription: false,
    toolCalling: true,
    streaming: true,
    vision: false,
    maxInputTokens: 32768,
    maxOutputTokens: 4096,
  },
  deepseek: {
    languageModel: true,
    embedding: false,
    imageGeneration: false,
    audioGeneration: false,
    audioTranscription: false,
    toolCalling: true,
    streaming: true,
    vision: false,
    maxInputTokens: 4096,
    maxOutputTokens: 4096,
  },
  perplexity: {
    languageModel: true,
    embedding: false,
    imageGeneration: false,
    audioGeneration: false,
    audioTranscription: false,
    toolCalling: false,
    streaming: true,
    vision: false,
    maxInputTokens: 8192,
    maxOutputTokens: 4096,
  },
  xai: {
    languageModel: true,
    embedding: false,
    imageGeneration: false,
    audioGeneration: false,
    audioTranscription: false,
    toolCalling: true,
    streaming: true,
    vision: false,
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
  },
  qwen: {
    languageModel: true,
    embedding: false,
    imageGeneration: false,
    audioGeneration: false,
    audioTranscription: false,
    toolCalling: true,
    streaming: true,
    vision: false,
    maxInputTokens: 131072,
    maxOutputTokens: 4096,
  },
  gateway: {
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
};

/**
 * Provider-specific model mappings
 * Maps each provider to its available language models
 */
export interface ProviderModelMap {
  readonly openai: OpenAIModel;
  readonly anthropic: AnthropicModel;
  readonly google: GoogleModel;
  readonly groq: GroqModel;
  readonly deepseek: DeepSeekModel;
  readonly perplexity: PerplexityModel;
  readonly xai: XaiModel;
  readonly qwen: QwenModel;
  readonly gateway: GatewayModel;
}

/**
 * Mapping of all supported models by provider
 */
export const PROVIDER_MODELS: Readonly<
  Record<SupportedProvider, readonly string[]>
> = {
  openai: [
    "gpt-5.2",
    "gpt-5.1",
    "gpt-5.0",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
  ],
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ],
  google: [
    "gemini-3-pro",
    "gemini-3-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
  ],
  groq: ["mixtral-8x7b-32768", "llama2-70b-4096", "gemma-7b-it"],
  deepseek: ["deepseek-coder", "deepseek-chat"],
  perplexity: [
    "pplx-70b-online",
    "pplx-7b-online",
    "pplx-70b-chat",
    "pplx-7b-chat",
  ],
  xai: ["grok-2", "grok-1"],
  qwen: ["qwen-turbo", "qwen-plus", "qwen-max"],
  gateway: [], // Gateway supports dynamic models
} as const;

/**
 * Type-safe provider and model combination check
 * Returns true if the model is supported by the provider
 *
 * @param provider - The provider name
 * @param model - The model identifier
 * @returns Whether the model is supported by the provider
 *
 * @example
 * ```typescript
 * const isSupported = isSupportedModel("openai", "gpt-4o") // true
 * const isUnsupported = isSupportedModel("openai", "claude-opus") // false
 * ```
 */
export function isSupportedModel(
  provider: SupportedProvider,
  model: string
): boolean {
  const models = PROVIDER_MODELS[provider];
  // Gateway supports any model dynamically
  if (provider === "gateway") return true;
  return models.includes(model);
}

/**
 * Provider aliases and OpenAI-compatible endpoints
 * Some providers use OpenAI-compatible APIs and share the same base implementation
 */
export const PROVIDER_ALIASES: Readonly<Record<string, SupportedProvider>> = {
  // Direct providers
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  groq: "groq",
  // OpenAI-compatible providers (using openai SDK under the hood)
  deepseek: "deepseek",
  perplexity: "perplexity",
  xai: "xai",
  qwen: "qwen",
  // Gateway
  gateway: "gateway",
} as const;

/**
 * Provider API base URLs
 * Default base URLs for each provider when not explicitly configured
 */
export const PROVIDER_BASE_URLS: Readonly<
  Record<SupportedProvider, string | null>
> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  google: null, // Google uses different authentication
  groq: "https://api.groq.com/openai/v1",
  deepseek: "https://api.deepseek.com",
  perplexity: "https://api.perplexity.ai",
  xai: "https://api.x.ai/v1",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  gateway: null, // Gateway is Vercel-specific
} as const;

/**
 * Provider authentication details
 * Information about how to configure each provider
 */
export interface ProviderAuthConfig {
  /** Environment variable name for API key */
  readonly apiKeyEnvVar: string;
  /** Whether the provider supports organization/workspace ID */
  readonly supportsOrganization: boolean;
  /** Whether the provider supports project ID */
  readonly supportsProject: boolean;
  /** Whether the provider supports custom base URL */
  readonly supportsCustomBaseUrl: boolean;
  /** Required environment variables for this provider */
  readonly requiredEnvVars: readonly string[];
  /** Optional environment variables for this provider */
  readonly optionalEnvVars: readonly string[];
}

/**
 * Provider authentication configuration details
 */
export const PROVIDER_AUTH_CONFIG: Readonly<
  Record<SupportedProvider, ProviderAuthConfig>
> = {
  openai: {
    apiKeyEnvVar: "OPENAI_API_KEY",
    supportsOrganization: true,
    supportsProject: true,
    supportsCustomBaseUrl: true,
    requiredEnvVars: ["OPENAI_API_KEY"],
    optionalEnvVars: ["OPENAI_ORG_ID", "OPENAI_PROJECT_ID"],
  },
  anthropic: {
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    supportsOrganization: false,
    supportsProject: false,
    supportsCustomBaseUrl: true,
    requiredEnvVars: ["ANTHROPIC_API_KEY"],
    optionalEnvVars: [],
  },
  google: {
    apiKeyEnvVar: "GOOGLE_API_KEY",
    supportsOrganization: false,
    supportsProject: false,
    supportsCustomBaseUrl: false,
    requiredEnvVars: ["GOOGLE_API_KEY"],
    optionalEnvVars: [],
  },
  groq: {
    apiKeyEnvVar: "GROQ_API_KEY",
    supportsOrganization: false,
    supportsProject: false,
    supportsCustomBaseUrl: true,
    requiredEnvVars: ["GROQ_API_KEY"],
    optionalEnvVars: [],
  },
  deepseek: {
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
    supportsOrganization: false,
    supportsProject: false,
    supportsCustomBaseUrl: true,
    requiredEnvVars: ["DEEPSEEK_API_KEY"],
    optionalEnvVars: [],
  },
  perplexity: {
    apiKeyEnvVar: "PERPLEXITY_API_KEY",
    supportsOrganization: false,
    supportsProject: false,
    supportsCustomBaseUrl: true,
    requiredEnvVars: ["PERPLEXITY_API_KEY"],
    optionalEnvVars: [],
  },
  xai: {
    apiKeyEnvVar: "XAI_API_KEY",
    supportsOrganization: false,
    supportsProject: false,
    supportsCustomBaseUrl: true,
    requiredEnvVars: ["XAI_API_KEY"],
    optionalEnvVars: [],
  },
  qwen: {
    apiKeyEnvVar: "QWEN_API_KEY",
    supportsOrganization: false,
    supportsProject: false,
    supportsCustomBaseUrl: true,
    requiredEnvVars: ["QWEN_API_KEY"],
    optionalEnvVars: [],
  },
  gateway: {
    apiKeyEnvVar: "VERCEL_AI_GATEWAY_API_KEY",
    supportsOrganization: false,
    supportsProject: false,
    supportsCustomBaseUrl: true,
    requiredEnvVars: ["VERCEL_AI_GATEWAY_API_KEY"],
    optionalEnvVars: [],
  },
} as const;

/**
 * Provider feature comparison
 * Quick reference for comparing capabilities across providers
 */
export const PROVIDER_COMPARISON = {
  /** Providers with the lowest latency (ideal for real-time applications) */
  lowestLatency: ["groq"] as const,
  /** Providers with the best reasoning capabilities */
  bestReasoning: ["openai", "anthropic", "google"] as const,
  /** Providers with the most affordable pricing */
  mostAffordable: ["groq", "qwen"] as const,
  /** Providers with the largest context windows */
  largestContext: ["google", "qwen"] as const,
  /** Providers with vision capabilities */
  withVision: ["openai", "anthropic", "google"] as const,
  /** Providers with tool calling support */
  withToolCalling: [
    "openai",
    "anthropic",
    "google",
    "groq",
    "deepseek",
    "xai",
    "qwen",
  ] as const,
  /** Providers with streaming support */
  withStreaming: [
    "openai",
    "anthropic",
    "google",
    "groq",
    "deepseek",
    "perplexity",
    "xai",
    "qwen",
  ] as const,
} as const;

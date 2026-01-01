/**
 * @file Main entry point for @org_name/effect-ai-model-sdk
 * @module @org_name/effect-ai-model-sdk
 */

// Re-export core operations
export {
  generateAudio,
  generateEmbeddings,
  generateImages,
  generateObject,
  generateText,
  transcribeAudio,
} from "./core/operations.js";

// Re-export streaming operations
export { streamObject, streamText } from "./streaming/index.js";

// Re-export error types
export {
  AiSdkConfigError,
  AiSdkError,
  AiSdkMessageTransformError,
  AiSdkOperationError,
  AiSdkProviderError,
  AiSdkSchemaError,
} from "./errors.js";

// Re-export provider system
export {
  createProvider,
  getEmbeddingModel,
  getLanguageModel,
  getLanguageModelByName,
  type ProviderConfig,
  type ProviderName,
} from "./providers/factory.js";

// Re-export message types and utilities
export {
  EffectiveRole,
  ImageUrlPart,
  Message,
  Metadata,
  Part,
  TextPart,
  ToolCallPart,
  ToolPart,
  toEffectiveMessage,
  toEffectiveMessages,
  toVercelMessage,
  toVercelMessages,
  type EffectiveMessage,
} from "./types/messages.js";

// Re-export schema utilities
export {
  encodeWithSchema,
  toStandardSchema,
  toZodSchema,
  validateWithSchema,
} from "./schema.js";

// Re-export input types
export type {
  ChatOptions,
  EffectiveInput,
  GenerateEmbeddingsOptions,
  GenerateImageOptions,
  GenerateObjectOptions,
  GenerateSpeechOptions,
  GenerateTextOptions,
  StreamObjectOptions,
  StreamTextOptions,
  TranscribeOptions,
} from "./types/inputs.js";

// Re-export result types
export type {
  ChatResult,
  GenerateEmbeddingsResult,
  GenerateImageResult,
  GenerateObjectResult,
  GenerateSpeechResult,
  GenerateTextResult,
  StreamingObjectChunk,
  StreamingTextChunk,
  TranscribeResult,
} from "./types/results.js";

// Re-export core types
export type {
  BaseAiOptions,
  BaseAiParameters,
  EffectiveResponse,
  EffectiveUsage,
  FinishReason,
  GenerateBaseResult,
  ProviderEffectiveResponse,
} from "./types/core.js";

// Re-export provider and model types
export type {
  AnthropicModel,
  DeepSeekModel,
  GoogleEmbeddingModel,
  GoogleModel,
  GroqModel,
  OpenAIAudioModel,
  OpenAIEmbeddingModel,
  OpenAIImageModel,
  OpenAIModel,
  PerplexityModel,
  ProviderAuthConfig,
  ProviderCapabilities,
  ProviderModelMap,
  QwenModel,
  SupportedAudioModel,
  SupportedEmbeddingModel,
  SupportedImageModel,
  SupportedLanguageModel,
  SupportedModel,
  SupportedProvider,
  XaiModel,
  GatewayModel,
} from "./types/models.js";

export {
  PROVIDER_ALIASES,
  PROVIDER_AUTH_CONFIG,
  PROVIDER_BASE_URLS,
  PROVIDER_CAPABILITIES,
  PROVIDER_COMPARISON,
  PROVIDER_MODELS,
  isSupportedModel,
} from "./types/models.js";

// Re-export tools
export { defineTool, runTools } from "./tools/index.js";
export type { Tool, ToolDefinition } from "./tools/types.js";

// Re-export fetch-content tool
export {
  FetchContentInputSchema,
  FetchContentOutputSchema,
  fetchContentImpl,
} from "./tools/fetch-content.js";
export type {
  FetchContentInput,
  FetchContentOutput,
} from "./tools/fetch-content.js";

// Re-export agent runner interfaces and error
export { AgentRunnerError } from "./agent-runner.js";
export type {
  AgentRunInput,
  AgentRunOutput,
  AgentRunner,
} from "./agent-runner.js";

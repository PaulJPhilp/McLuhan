/**
 * @file Provider factory for creating AI provider instances
 * @module @org_name/effect-ai-model-sdk/providers/factory
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import * as Effect from "effect/Effect";
import { AiSdkConfigError, AiSdkProviderError } from "../errors.js";

/**
 * Supported provider names
 */
export type ProviderName =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "perplexity"
  | "qwen"
  | "xai"
  | "groq";

/**
 * Provider configuration options
 */
export interface ProviderConfig {
  readonly apiKey: string;
  readonly baseURL?: string;
  readonly organization?: string;
  readonly project?: string;
}

/**
 * Create a provider instance for the specified provider
 */
export function createProvider(
  providerName: ProviderName,
  config: ProviderConfig
): Effect.Effect<any, AiSdkProviderError | AiSdkConfigError> {
  return Effect.gen(function* () {
    if (!config.apiKey) {
      return yield* Effect.fail(
        new AiSdkConfigError({
          message: `API key is required for provider: ${providerName}`,
          configKey: "apiKey",
        })
      );
    }

    try {
      switch (providerName) {
        case "openai":
          return createOpenAI({
            apiKey: config.apiKey,
            ...(config.baseURL ? { baseURL: config.baseURL } : {}),
            ...(config.organization
              ? { organization: config.organization }
              : {}),
            ...(config.project ? { project: config.project } : {}),
          });

        case "anthropic":
          return createAnthropic({
            apiKey: config.apiKey,
            ...(config.baseURL ? { baseURL: config.baseURL } : {}),
          });

        case "google":
          // Google provider needs API key passed when creating models
          // Return a wrapper that includes the API key
          return {
            _isGoogleProvider: true,
            _apiKey: config.apiKey,
            _provider: google,
          };

        case "groq":
          return createGroq({
            apiKey: config.apiKey,
            ...(config.baseURL ? { baseURL: config.baseURL } : {}),
          });

        case "deepseek":
          // DeepSeek uses OpenAI-compatible API
          return createOpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL || "https://api.deepseek.com",
          });

        case "perplexity":
          // Perplexity uses OpenAI-compatible API
          return createOpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL || "https://api.perplexity.ai",
          });

        case "xai":
          // xAI uses OpenAI-compatible API
          return createOpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL || "https://api.x.ai/v1",
          });

        case "qwen":
          // Qwen uses OpenAI-compatible API
          return createOpenAI({
            apiKey: config.apiKey,
            baseURL:
              config.baseURL ||
              "https://dashscope.aliyuncs.com/compatible-mode/v1",
          });

        default:
          return yield* Effect.fail(
            new AiSdkProviderError({
              message: `Unknown provider: ${providerName}`,
              provider: providerName,
            })
          );
      }
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkProviderError({
          message: `Failed to create provider: ${providerName}`,
          provider: providerName,
          cause: error,
        })
      );
    }
  });
}

/**
 * Get a language model instance from a provider
 */
export function getLanguageModel(
  provider: any,
  modelId: string
): Effect.Effect<any, AiSdkProviderError> {
  return Effect.gen(function* () {
    try {
      // Handle Google provider wrapper with API key
      if (provider._isGoogleProvider) {
        // Validate Google provider wrapper structure
        if (!provider._apiKey) {
          return yield* Effect.fail(
            new AiSdkProviderError({
              message: `Google provider wrapper missing API key for model ${modelId}`,
              provider: "google",
            })
          );
        }
        if (!provider._provider) {
          return yield* Effect.fail(
            new AiSdkProviderError({
              message: `Google provider wrapper missing provider instance for model ${modelId}`,
              provider: "google",
            })
          );
        }

        // Google provider uses languageModel method with API key in options
        try {
          console.log(
            `[Google] Creating model ${modelId} with API key length: ${provider._apiKey.length}`
          );
          const model = provider._provider.languageModel(modelId, {
            apiKey: provider._apiKey,
          });
          console.log(`[Google] Model ${modelId} created successfully`);
          return model;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error(
            `[Google] Failed to create model ${modelId}:`,
            errorMessage
          );
          if (errorStack) {
            console.error(`[Google] Error stack:`, errorStack);
          }
          if (error instanceof Error && error.name) {
            console.error(`[Google] Error name:`, error.name);
          }
          return yield* Effect.fail(
            new AiSdkProviderError({
              message: `Failed to create Google model ${modelId}: ${errorMessage}`,
              provider: "google",
              cause: error,
            })
          );
        }
      }

      // Most providers use the function call pattern
      if (typeof provider === "function") {
        return provider(modelId);
      }

      // Some providers might have a .chat or .languageModel method
      if (provider.chat && typeof provider.chat === "function") {
        return provider.chat(modelId);
      }

      if (
        provider.languageModel &&
        typeof provider.languageModel === "function"
      ) {
        return provider.languageModel(modelId);
      }

      return yield* Effect.fail(
        new AiSdkProviderError({
          message: `Provider does not support language models`,
          provider: "unknown",
        })
      );
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkProviderError({
          message: `Failed to get language model: ${modelId}`,
          provider: "unknown",
          cause: error,
        })
      );
    }
  });
}

/**
 * Get a language model instance by provider name and model ID
 * This function loads the provider config from environment variables
 */
export function getLanguageModelByName(
  providerName: ProviderName,
  modelId: string
): Effect.Effect<any, AiSdkProviderError | AiSdkConfigError> {
  return Effect.gen(function* () {
    // Load config from environment variables
    const apiKey = process.env[`${providerName.toUpperCase()}_API_KEY`];
    if (!apiKey) {
      return yield* Effect.fail(
        new AiSdkConfigError({
          message: `API key not found for provider: ${providerName}`,
          configKey: `${providerName.toUpperCase()}_API_KEY`,
        })
      );
    }

    const config: ProviderConfig = {
      apiKey,
      // Add other config options if needed
    };

    // Create the provider
    const provider = yield* createProvider(providerName, config);

    // Get the language model
    return yield* getLanguageModel(provider, modelId);
  });
}

/**
 * Get an embedding model instance from a provider
 */
export function getEmbeddingModel(
  provider: any,
  modelId: string
): Effect.Effect<any, AiSdkProviderError> {
  return Effect.gen(function* () {
    try {
      if (provider.embedding && typeof provider.embedding === "function") {
        return provider.embedding(modelId);
      }

      if (provider.embedding && typeof provider.embedding === "function") {
        return provider.embedding(modelId);
      }

      return yield* Effect.fail(
        new AiSdkProviderError({
          message: `Provider does not support embedding models`,
          provider: "unknown",
        })
      );
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkProviderError({
          message: `Failed to get embedding model: ${modelId}`,
          provider: "unknown",
          cause: error,
        })
      );
    }
  });
}

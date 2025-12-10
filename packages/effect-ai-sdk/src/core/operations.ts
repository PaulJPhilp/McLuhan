/**
 * @file Core AI operations - Effect wrappers around Vercel AI SDK
 * @module @org_name/effect-ai-model-sdk/core/operations
 */

import type { EmbeddingModel, ImageModel, LanguageModel } from "ai";
import {
  embedMany,
  experimental_generateImage,
  experimental_generateSpeech,
  experimental_transcribe,
  generateObject as vercelGenerateObject,
  generateText as vercelGenerateText,
} from "ai";
import * as Effect from "effect/Effect";
import {
  type AiSdkMessageTransformError,
  AiSdkOperationError,
} from "../errors.js";
import type { EffectiveResponse } from "../types/core.js";
import type {
  EffectiveInput,
  GenerateObjectOptions,
  GenerateTextOptions,
} from "../types/inputs.js";
import { toVercelMessages } from "../types/messages.js";
import type {
  GenerateEmbeddingsResult,
  GenerateImageResult,
  GenerateObjectResult,
  GenerateSpeechResult,
  GenerateTextResult,
  TranscribeResult,
} from "../types/results.js";

/**
 * Generate text using a language model
 */
export function generateText(
  model: LanguageModel,
  input: EffectiveInput,
  options?: Partial<GenerateTextOptions>
): Effect.Effect<
  EffectiveResponse<GenerateTextResult>,
  AiSdkOperationError | AiSdkMessageTransformError | unknown
> {
  return Effect.gen(function* () {
    yield* Effect.log("Starting text generation", {
      model: (model as any).modelId || "unknown",
      hasMessages: !!input.messages,
      hasText: !!input.text,
    });

    try {
      // Convert messages if provided
      let messages: any[] = [];
      if (input.messages) {
        messages = yield* toVercelMessages(input.messages);
      } else if (input.text) {
        messages = [{ role: "user", content: input.text }];
      }

      // Call Vercel AI SDK
      const result = yield* Effect.tryPromise(
        async () =>
          await vercelGenerateText({
            model,
            messages,
            system: options?.system,
            temperature: options?.parameters?.temperature,
            // @ts-ignore - maxTokens is valid in v5 but types might be mismatching
            maxTokens: options?.parameters?.maxTokens,
            topP: options?.parameters?.topP,
            frequencyPenalty: options?.parameters?.frequencyPenalty,
            presencePenalty: options?.parameters?.presencePenalty,
            seed: options?.parameters?.seed,
          })
      ).pipe(
        Effect.mapError(
          (error) =>
            new AiSdkOperationError({
              message: "Failed to generate text",
              operation: "generateText",
              cause: error,
            })
        )
      );

      // Transform result
      const resultTyped = result as any; // Type assertion for v5 API
      const textResult: GenerateTextResult = {
        id: resultTyped.response.id,
        model: resultTyped.response.modelId,
        timestamp: resultTyped.response.timestamp,
        text: resultTyped.text,
        finishReason: resultTyped.finishReason as any,
        usage: {
          promptTokens: resultTyped.usage.promptTokens,
          completionTokens: resultTyped.usage.completionTokens,
          totalTokens: resultTyped.usage.totalTokens,
        },
        warnings: resultTyped.warnings?.map((w: any) => ({
          code: w.type || "warning",
          message: "type" in w ? `${w.type}: ${w.setting || ""}` : "warning",
        })),
      };

      yield* Effect.log("Text generation completed successfully", {
        model: result.response.modelId,
        tokens: textResult.usage.totalTokens,
      });

      return {
        data: textResult,
        metadata: {
          model: result.response.modelId,
          provider: "unknown",
        },
        usage: textResult.usage,
        finishReason: textResult.finishReason,
      };
    } catch (error) {
      yield* Effect.logError("Text generation failed", { error });
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during text generation",
          operation: "generateText",
          cause: error,
        })
      );
    }
  });
}

/**
 * Generate a structured object using a language model
 */
export function generateObject<T>(
  model: LanguageModel,
  input: EffectiveInput,
  schema: any,
  options?: Partial<GenerateObjectOptions<T>>
): Effect.Effect<
  EffectiveResponse<GenerateObjectResult<T>>,
  AiSdkOperationError | AiSdkMessageTransformError | unknown
> {
  return Effect.gen(function* () {
    try {
      // Convert messages if provided
      let messages: any[] = [];
      if (input.messages) {
        messages = yield* toVercelMessages(input.messages);
      } else if (input.text) {
        messages = [{ role: "user", content: input.text }];
      }

      // Call Vercel AI SDK
      const result = yield* Effect.tryPromise(
        async () =>
          await vercelGenerateObject({
            model,
            messages,
            schema,
            system: options?.system,
            temperature: options?.parameters?.temperature,
            // @ts-ignore - maxTokens is valid in v5 but types might be mismatching
            maxTokens: options?.parameters?.maxTokens,
            topP: options?.parameters?.topP,
          })
      ).pipe(
        Effect.mapError(
          (error) =>
            new AiSdkOperationError({
              message: "Failed to generate object",
              operation: "generateObject",
              cause: error,
            })
        )
      );

      // Transform result
      const resultTyped = result as any; // Type assertion for v5 API
      const objectResult: GenerateObjectResult<T> = {
        id: resultTyped.response.id,
        model: resultTyped.response.modelId,
        timestamp: resultTyped.response.timestamp,
        object: resultTyped.object as T,
        finishReason: resultTyped.finishReason as any,
        usage: {
          promptTokens: resultTyped.usage.promptTokens,
          completionTokens: resultTyped.usage.completionTokens,
          totalTokens: resultTyped.usage.totalTokens,
        },
      };

      return {
        data: objectResult,
        metadata: {
          model: result.response.modelId,
          provider: "unknown",
        },
        usage: objectResult.usage,
        finishReason: objectResult.finishReason,
      };
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during object generation",
          operation: "generateObject",
          cause: error,
        })
      );
    }
  });
}

/**
 * Generate embeddings for text inputs
 */
export function generateEmbeddings(
  model: EmbeddingModel<string>,
  texts: string[]
): Effect.Effect<
  EffectiveResponse<GenerateEmbeddingsResult>,
  AiSdkOperationError | unknown
> {
  return Effect.gen(function* () {
    try {
      const result = yield* Effect.tryPromise(
        async () =>
          await embedMany({
            model,
            values: texts,
          })
      ).pipe(
        Effect.mapError(
          (error) =>
            new AiSdkOperationError({
              message: "Failed to generate embeddings",
              operation: "embedMany",
              cause: error,
            })
        )
      );

      // Transform result
      const resultTyped = result as any; // Type assertion for v5 API
      const embeddingsResult: GenerateEmbeddingsResult = {
        id: `embedding-${Date.now()}`,
        model: "unknown",
        timestamp: new Date(),
        embeddings: resultTyped.embeddings,
        dimensions: resultTyped.embeddings[0]?.length || 0,
        texts,
        finishReason: "stop",
        usage: {
          promptTokens: resultTyped.usage?.tokens || 0,
          completionTokens: 0,
          totalTokens: resultTyped.usage?.tokens || 0,
        },
        parameters: {},
      };

      return {
        data: embeddingsResult,
        metadata: {
          model: "unknown",
          provider: "unknown",
        },
        usage: embeddingsResult.usage,
        finishReason: embeddingsResult.finishReason,
      };
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during embedding generation",
          operation: "embedMany",
          cause: error,
        })
      );
    }
  });
}

/**
 * Generate images using an image model
 */
export function generateImages(
  model: ImageModel,
  prompt: string,
  options?: { n?: number; size?: string; aspectRatio?: string }
): Effect.Effect<
  EffectiveResponse<GenerateImageResult>,
  AiSdkOperationError | unknown
> {
  return Effect.gen(function* () {
    try {
      const result = yield* Effect.tryPromise(
        async () =>
          await experimental_generateImage({
            model,
            prompt,
            n: options?.n ?? 1,
            size: options?.size as any,
            aspectRatio: options?.aspectRatio as any,
          })
      ).pipe(
        Effect.mapError(
          (error) =>
            new AiSdkOperationError({
              message: "Failed to generate image",
              operation: "generateImage",
              cause: error,
            })
        )
      );

      // Transform result
      const resultTyped = result as any; // Type assertion for v5 API
      const imageResult: GenerateImageResult = {
        id: `image-${Date.now()}`,
        model: "unknown",
        timestamp: new Date(),
        imageUrl: resultTyped.images[0]?.url || "",
        additionalImages: resultTyped.images
          .slice(1)
          .map((img: any) => img.url || ""),
        parameters: {
          size: options?.size,
        },
        usage: {
          promptTokens: 0, // Image generation doesn't use text tokens in the same way
          completionTokens: 0,
          totalTokens: 0,
        },
        finishReason: "stop",
      };

      return {
        data: imageResult,
        metadata: {
          model: "unknown",
          provider: "unknown",
        },
        usage: imageResult.usage,
        finishReason: imageResult.finishReason,
      };
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during image generation",
          operation: "generateImage",
          cause: error,
        })
      );
    }
  });
}

/**
 * Generate speech using a speech model
 */
export function generateAudio(
  model: any, // SpeechModelV1 not exported from ai package yet
  input: string,
  options?: { voice?: string; speed?: number }
): Effect.Effect<
  EffectiveResponse<GenerateSpeechResult>,
  AiSdkOperationError | unknown
> {
  return Effect.gen(function* () {
    try {
      const result = yield* Effect.tryPromise(
        async () =>
          await experimental_generateSpeech({
            model,
            text: input,
            voice: options?.voice as any,
            speed: options?.speed,
          })
      ).pipe(
        Effect.mapError(
          (error) =>
            new AiSdkOperationError({
              message: "Failed to generate speech",
              operation: "generateSpeech",
              cause: error,
            })
        )
      );

      // Transform result
      const resultTyped = result as any; // Type assertion for v5 API
      const speechResult: GenerateSpeechResult = {
        id: `speech-${Date.now()}`,
        model: "unknown",
        timestamp: new Date(),
        audioData: resultTyped.audio || "",
        format: "mp3", // Default format
        parameters: {
          voice: options?.voice,
          speed: options?.speed,
        },
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        finishReason: "stop",
      };

      return {
        data: speechResult,
        metadata: {
          model: "unknown",
          provider: "unknown",
        },
        usage: speechResult.usage,
        finishReason: speechResult.finishReason,
      };
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during speech generation",
          operation: "generateSpeech",
          cause: error,
        })
      );
    }
  });
}

/**
 * Transcribe audio using a transcription model
 */
export function transcribeAudio(
  model: any, // TranscriptionModelV1 not exported yet
  audio: Uint8Array,
  options?: { language?: string }
): Effect.Effect<
  EffectiveResponse<TranscribeResult>,
  AiSdkOperationError | unknown
> {
  return Effect.gen(function* () {
    try {
      const result = yield* Effect.tryPromise(
        async () =>
          await experimental_transcribe({
            model,
            audio: audio,
            // language: options?.language, // Not supported in v5 types directly?
          })
      ).pipe(
        Effect.mapError(
          (error) =>
            new AiSdkOperationError({
              message: "Failed to transcribe audio",
              operation: "transcribe",
              cause: error,
            })
        )
      );

      // Transform result
      const resultTyped = result as any; // Type assertion for v5 API
      const transcriptionResult: TranscribeResult = {
        id: `transcription-${Date.now()}`,
        model: "unknown",
        timestamp: new Date(),
        text: resultTyped.text,
        segments: resultTyped.segments?.map((seg: any) => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          confidence: seg.confidence,
        })),
        detectedLanguage: resultTyped.language,
        parameters: {
          language: options?.language,
        },
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        finishReason: "stop",
      };

      return {
        data: transcriptionResult,
        metadata: {
          model: "unknown",
          provider: "unknown",
        },
        usage: transcriptionResult.usage,
        finishReason: transcriptionResult.finishReason,
      };
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkOperationError({
          message: "Unexpected error during audio transcription",
          operation: "transcribe",
          cause: error,
        })
      );
    }
  });
}

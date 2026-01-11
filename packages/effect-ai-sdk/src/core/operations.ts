/**
 * @file Core AI operations - Effect wrappers around Vercel AI SDK
 * @module @org_name/effect-ai-model-sdk/core/operations
 */

import type {
  EmbeddingModel,
  ImageModel,
  LanguageModel,
  ModelMessage,
} from "ai";
import {
  Output,
  embedMany,
  experimental_generateSpeech,
  experimental_transcribe,
  generateImage,
  generateText as vercelGenerateText,
} from "ai";
import * as Effect from "effect/Effect";
import {
  AiSdkOperationError,
  type AiSdkMessageTransformError,
} from "../errors.js";
import type { EffectiveResponse, FinishReason } from "../types/core.js";
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
 * Helper to safely extract model identifier from LanguageModel
 */
function getModelId(model: LanguageModel): string {
  if (typeof model === "object" && model !== null) {
    if ("modelId" in model && typeof model.modelId === "string") {
      return model.modelId;
    }
    if ("model" in model && typeof model.model === "string") {
      return model.model;
    }
  }
  return "unknown";
}

/**
 * Type for Vercel AI SDK generateText result
 */
interface VercelGenerateTextResult {
  readonly response: {
    readonly id: string;
    readonly modelId: string;
    readonly timestamp: Date;
  };
  readonly text: string;
  readonly finishReason: string;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly warnings?: ReadonlyArray<{
    readonly type?: string;
    readonly setting?: string;
  }>;
}

/**
 * Type for Vercel AI SDK generateText result with Output.object
 */
interface VercelGenerateObjectResult<T> {
  readonly response: {
    readonly id: string;
    readonly modelId: string;
    readonly timestamp: Date;
  };
  readonly output: T;
  readonly finishReason: string;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
}

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
      model: getModelId(model),
      hasMessages: !!input.messages,
      hasText: !!input.text,
    });

    try {
      // Convert messages if provided
      let messages: ModelMessage[] = [];
      if (input.messages) {
        messages = yield* toVercelMessages(input.messages);
      } else if (input.text) {
        messages = [{ role: "user", content: input.text }];
      }

      // Call Vercel AI SDK
      const result: Awaited<ReturnType<typeof vercelGenerateText>> =
        yield* Effect.tryPromise(
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

      // Transform result - access properties directly from Vercel result
      const textResult: GenerateTextResult = {
        id: result.response.id,
        model: result.response.modelId,
        timestamp: result.response.timestamp,
        text: result.text,
        finishReason: result.finishReason as FinishReason,
        usage: {
          promptTokens:
            "promptTokens" in result.usage
              ? (result.usage.promptTokens as number)
              : 0,
          completionTokens:
            "completionTokens" in result.usage
              ? (result.usage.completionTokens as number)
              : 0,
          totalTokens:
            "totalTokens" in result.usage
              ? (result.usage.totalTokens as number)
              : 0,
        },
        ...(result.warnings && result.warnings.length > 0
          ? {
              warnings: result.warnings.map((w) => {
                const warning = w as { type?: string; setting?: string };
                return {
                  code: warning.type || "warning",
                  message: warning.type
                    ? `${warning.type}: ${warning.setting || ""}`
                    : "warning",
                };
              }),
            }
          : {}),
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
      let messages: ModelMessage[] = [];
      if (input.messages) {
        messages = yield* toVercelMessages(input.messages);
      } else if (input.text) {
        messages = [{ role: "user", content: input.text }];
      }

      // Call Vercel AI SDK
      // generateObject is deprecated in v6, using generateText with Output.object instead
      const result: Awaited<ReturnType<typeof vercelGenerateText>> =
        yield* Effect.tryPromise(
          async () =>
            await vercelGenerateText({
              model,
              messages,
              output: Output.object({
                schema: schema,
              }),
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

      // Transform result - access properties directly from Vercel result
      // Type guard to check if result has output property (from Output.object)
      const hasOutput = "output" in result;
      if (!hasOutput) {
        throw new Error("Expected result with output property");
      }
      const resultWithOutput = result as {
        response: { id: string; modelId: string; timestamp: Date };
        output: T;
        finishReason: string;
        usage: {
          promptTokens?: number;
          completionTokens?: number;
          totalTokens?: number;
        };
      };
      const objectResult: GenerateObjectResult<T> = {
        id: resultWithOutput.response.id,
        model: resultWithOutput.response.modelId,
        timestamp: resultWithOutput.response.timestamp,
        object: resultWithOutput.output,
        finishReason: resultWithOutput.finishReason as FinishReason,
        usage: {
          promptTokens: resultWithOutput.usage.promptTokens ?? 0,
          completionTokens: resultWithOutput.usage.completionTokens ?? 0,
          totalTokens: resultWithOutput.usage.totalTokens ?? 0,
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
  model: EmbeddingModel,
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

      // Transform result - access properties directly
      const embeddingsResult: GenerateEmbeddingsResult = {
        id: `embedding-${Date.now()}`,
        model: "unknown",
        timestamp: new Date(),
        embeddings: result.embeddings,
        dimensions: result.embeddings[0]?.length || 0,
        texts,
        finishReason: "stop",
        usage: {
          promptTokens:
            "usage" in result && result.usage && "tokens" in result.usage
              ? (result.usage.tokens as number)
              : 0,
          completionTokens: 0,
          totalTokens:
            "usage" in result && result.usage && "tokens" in result.usage
              ? (result.usage.tokens as number)
              : 0,
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
          await generateImage({
            model,
            prompt,
            n: options?.n ?? 1,
            ...(options?.size
              ? {
                  size: options.size as "1024x1024" | "1792x1024" | "1024x1792",
                }
              : {}),
            ...(options?.aspectRatio
              ? {
                  aspectRatio: options.aspectRatio as "1:1" | "16:9" | "9:16",
                }
              : {}),
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

      // Transform result - access properties directly
      const imageResult: GenerateImageResult = {
        id: `image-${Date.now()}`,
        model: "unknown",
        timestamp: new Date(),
        imageUrl:
          result.images[0] && "url" in result.images[0]
            ? (result.images[0].url as string)
            : result.images[0] && "data" in result.images[0]
              ? (result.images[0].data as string)
              : "",
        additionalImages: result.images.slice(1).map((img) => {
          const image = img as { url?: string; data?: string };
          return image.url || image.data || "";
        }),
        parameters: {
          ...(options?.size ? { size: options.size } : {}),
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
            ...(options?.voice ? { voice: options.voice as any } : {}),
            ...(options?.speed !== undefined ? { speed: options.speed } : {}),
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

      // Transform result - access properties directly
      const speechResult: GenerateSpeechResult = {
        id: `speech-${Date.now()}`,
        model: "unknown",
        timestamp: new Date(),
        audioData:
          "audio" in result && result.audio
            ? typeof result.audio === "string"
              ? result.audio
              : "data" in result.audio
                ? (result.audio.data as string)
                : ""
            : "",
        format: "mp3", // Default format
        parameters: {
          ...(options?.voice ? { voice: options.voice } : {}),
          ...(options?.speed !== undefined ? { speed: options.speed } : {}),
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

      // Transform result - access properties directly
      const transcriptionResult: TranscribeResult = {
        id: `transcription-${Date.now()}`,
        model: "unknown",
        timestamp: new Date(),
        text: result.text,
        segments: result.segments?.map((seg) => {
          const segment = seg as {
            id?: number | string;
            start?: number;
            end?: number;
            text?: string;
            confidence?: number;
          };
          return {
            id:
              typeof segment.id === "number"
                ? segment.id
                : typeof segment.id === "string"
                  ? parseInt(segment.id, 10) || 0
                  : 0,
            start: segment.start ?? 0,
            end: segment.end ?? 0,
            text: segment.text || "",
            confidence: segment.confidence ?? 0,
          };
        }),
        ...("language" in result && result.language
          ? { detectedLanguage: result.language as string }
          : {}),
        parameters: {
          ...(options?.language ? { language: options.language } : {}),
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

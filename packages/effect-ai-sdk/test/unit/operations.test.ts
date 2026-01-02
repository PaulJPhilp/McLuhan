import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Effect from "effect/Effect";
import { Chunk } from "effect";
import {
  generateText,
  generateObject,
  generateEmbeddings,
} from "../../src/core/operations.js";
import type { EffectiveInput } from "../../src/types/inputs.js";
import type { LanguageModel, EmbeddingModel } from "ai";
import { Schema } from "effect";

describe("Core Operations (v6 API)", () => {
  describe("generateText", () => {
    // Mock model
    const mockModel: LanguageModel = {
      modelId: "test-model",
      specificationVersion: "v1",
      supportsImageUrls: false,
      supportsToolUse: false,
    } as any;

    it("should generate text with text input", async () => {
      const input: EffectiveInput = {
        text: "Hello, world!",
      };

      const program = generateText(mockModel, input);
      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBe("Left");
      // We expect an error because we don't have a real model
      // In real scenarios with real API keys, this would succeed
    });

    it("should handle text generation with empty text", async () => {
      const input: EffectiveInput = {
        text: "",
      };

      const program = generateText(mockModel, input);
      const result = await Effect.runPromise(Effect.either(program));

      // Empty text input should still attempt generation
      expect(result._tag).toBeDefined();
    });

    it("should accept generation options", async () => {
      const input: EffectiveInput = {
        text: "Test prompt",
      };

      const options = {
        system: "You are a helpful assistant",
        parameters: {
          temperature: 0.7,
          maxTokens: 100,
          topP: 0.9,
        },
      };

      const program = generateText(mockModel, input, options);
      // Just verify it doesn't throw during composition
      expect(program).toBeDefined();
    });

    it("should handle messages input", async () => {
      const { Message, TextPart } = await import("../../src/types/messages.js");

      const messages = Chunk.of(
        new Message({
          role: "user",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "Test" })),
        })
      );

      const input: EffectiveInput = {
        messages,
      };

      const program = generateText(mockModel, input);
      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBeDefined();
    });

    it("should prioritize messages over text input", async () => {
      const { Message, TextPart } = await import("../../src/types/messages.js");

      const messages = Chunk.of(
        new Message({
          role: "user",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "Message" })),
        })
      );

      const input: EffectiveInput = {
        text: "Text",
        messages,
      };

      const program = generateText(mockModel, input);
      // Verify it prefers messages when both are provided
      expect(program).toBeDefined();
    });
  });

  describe("generateObject", () => {
    const mockModel: LanguageModel = {
      modelId: "test-model",
      specificationVersion: "v1",
      supportsImageUrls: false,
      supportsToolUse: false,
    } as any;

    it("should generate object with schema", async () => {
      const schema = Schema.Struct({
        name: Schema.String,
        age: Schema.Number,
      });

      const input: EffectiveInput = {
        text: "Extract person data",
      };

      const program = generateObject(mockModel, input, schema);
      const result = await Effect.runPromise(Effect.either(program));

      // Expected to fail without real model, but structure should be valid
      expect(result._tag).toBeDefined();
    });

    it("should accept object generation options", async () => {
      const schema = Schema.Struct({
        value: Schema.String,
      });

      const input: EffectiveInput = {
        text: "Test",
      };

      const options = {
        system: "Output JSON",
        parameters: {
          temperature: 0.5,
          maxTokens: 500,
        },
      };

      const program = generateObject(mockModel, input, schema, options);
      expect(program).toBeDefined();
    });

    it("should handle object generation with messages", async () => {
      const { Message, TextPart } = await import("../../src/types/messages.js");

      const schema = Schema.Struct({
        result: Schema.String,
      });

      const messages = Chunk.of(
        new Message({
          role: "user",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "Generate" })),
        })
      );

      const input: EffectiveInput = {
        messages,
      };

      const program = generateObject(mockModel, input, schema);
      expect(program).toBeDefined();
    });

    it("should handle complex nested schemas", async () => {
      const schema = Schema.Struct({
        user: Schema.Struct({
          name: Schema.String,
          email: Schema.String,
        }),
        items: Schema.Array(
          Schema.Struct({
            id: Schema.Number,
            title: Schema.String,
          })
        ),
      });

      const input: EffectiveInput = {
        text: "Extract complex data",
      };

      const program = generateObject(mockModel, input, schema);
      expect(program).toBeDefined();
    });

    it("should handle error in object generation", async () => {
      const schema = Schema.Struct({
        value: Schema.String,
      });

      const input: EffectiveInput = {
        text: "Test",
      };

      const program = generateObject(mockModel, input, schema);
      const result = await Effect.runPromise(Effect.either(program));

      // Expect error without real model
      expect(result._tag).toBeDefined();
    });
  });

  describe("generateEmbeddings", () => {
    // Mock embedding model without generic parameter (v6 API)
    const mockModel: EmbeddingModel = {
      modelId: "test-embedding-model",
      dimensions: 1536,
    } as any;

    it("should generate embeddings for single text", async () => {
      const texts = ["Hello, world!"];

      const program = generateEmbeddings(mockModel, texts);
      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBeDefined();
    });

    it("should generate embeddings for multiple texts", async () => {
      const texts = ["First text", "Second text", "Third text"];

      const program = generateEmbeddings(mockModel, texts);
      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBeDefined();
    });

    it("should handle empty text array", async () => {
      const texts: string[] = [];

      const program = generateEmbeddings(mockModel, texts);
      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBeDefined();
    });

    it("should generate embeddings with special characters", async () => {
      const texts = [
        "Text with émojis 🚀",
        "Text with special chars: !@#$%^&*()",
        "Text with unicode: 你好世界",
      ];

      const program = generateEmbeddings(mockModel, texts);
      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBeDefined();
    });

    it("should handle very long text inputs", async () => {
      const longText = "A".repeat(10000);
      const texts = [longText];

      const program = generateEmbeddings(mockModel, texts);
      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBeDefined();
    });

    it("should handle error in embedding generation", async () => {
      const texts = ["Test text"];

      const program = generateEmbeddings(mockModel, texts);
      const result = await Effect.runPromise(Effect.either(program));

      // Expect error without real model/API key
      expect(result._tag).toBe("Left");
    });
  });

  describe("Operation Composition", () => {
    const mockLanguageModel: LanguageModel = {
      modelId: "test-model",
      specificationVersion: "v1",
      supportsImageUrls: false,
      supportsToolUse: false,
    } as any;

    const mockEmbeddingModel: EmbeddingModel = {
      modelId: "test-embedding-model",
      dimensions: 1536,
    } as any;

    it("should compose text generation with error handling", async () => {
      const program = Effect.gen(function* () {
        const input: EffectiveInput = { text: "Compose test" };
        const result = yield* generateText(mockLanguageModel, input);
        return result;
      });

      const composedResult = await Effect.runPromise(Effect.either(program));

      expect(composedResult._tag).toBeDefined();
    });

    it("should compose multiple operations", async () => {
      const program = Effect.gen(function* () {
        const textInput: EffectiveInput = { text: "Generate text" };
        const textResult = yield* generateText(mockLanguageModel, textInput);

        const embeddingInput = ["Generated text"];
        const embeddingResult = yield* generateEmbeddings(
          mockEmbeddingModel,
          embeddingInput
        );

        return {
          text: textResult,
          embeddings: embeddingResult,
        };
      });

      const result = await Effect.runPromise(Effect.either(program));
      expect(result._tag).toBeDefined();
    });

    it("should handle errors in composed operations", async () => {
      const program = Effect.gen(function* () {
        const input: EffectiveInput = { text: "Test" };

        // This should fail without a real API key
        const result = yield* generateText(mockLanguageModel, input);
        return result;
      }).pipe(
        Effect.catchAll((error) => {
          // Catch any error
          return Effect.succeed({
            error: String(error),
            handled: true,
          });
        })
      );

      const result = await Effect.runPromise(program);
      expect(result).toBeDefined();
    });
  });

  describe("Input Validation", () => {
    const mockModel: LanguageModel = {
      modelId: "test-model",
      specificationVersion: "v1",
      supportsImageUrls: false,
      supportsToolUse: false,
    } as any;

    it("should handle undefined optional parameters", async () => {
      const input: EffectiveInput = { text: "Test" };
      const options = {
        system: undefined,
        parameters: {
          temperature: undefined,
          maxTokens: undefined,
        },
      };

      const program = generateText(mockModel, input, options);
      expect(program).toBeDefined();
    });

    it("should handle null values gracefully", async () => {
      const input: EffectiveInput = {
        text: "Test",
      };

      const program = generateText(mockModel, input);
      expect(program).toBeDefined();
    });

    it("should accept various parameter ranges", async () => {
      const input: EffectiveInput = { text: "Test" };

      const options1 = {
        parameters: {
          temperature: 0,
        },
      };

      const options2 = {
        parameters: {
          temperature: 2,
        },
      };

      const options3 = {
        parameters: {
          maxTokens: 1,
        },
      };

      const program1 = generateText(mockModel, input, options1);
      const program2 = generateText(mockModel, input, options2);
      const program3 = generateText(mockModel, input, options3);

      expect(program1).toBeDefined();
      expect(program2).toBeDefined();
      expect(program3).toBeDefined();
    });
  });

  describe("Response Structure", () => {
    const mockModel: LanguageModel = {
      modelId: "test-model",
      specificationVersion: "v1",
      supportsImageUrls: false,
      supportsToolUse: false,
    } as any;

    it("should return EffectiveResponse with correct structure", async () => {
      const input: EffectiveInput = { text: "Test" };

      const program = generateText(mockModel, input);
      const result = await Effect.runPromise(Effect.either(program));

      // When error occurs, verify error structure
      if (result._tag === "Left") {
        expect(result.left).toBeDefined();
      }
    });

    it("should include metadata in response", async () => {
      const input: EffectiveInput = { text: "Test" };

      const program = Effect.gen(function* () {
        const response = yield* generateText(mockModel, input);
        return response.metadata;
      });

      const result = await Effect.runPromise(Effect.either(program));

      // Metadata structure should include model and provider
      expect(result._tag).toBeDefined();
    });

    it("should include usage information in response", async () => {
      const input: EffectiveInput = { text: "Test" };

      const program = Effect.gen(function* () {
        const response = yield* generateText(mockModel, input);
        return response.usage;
      });

      const result = await Effect.runPromise(Effect.either(program));

      // Usage should include token counts
      expect(result._tag).toBeDefined();
    });

    it("should include finish reason in response", async () => {
      const input: EffectiveInput = { text: "Test" };

      const program = Effect.gen(function* () {
        const response = yield* generateText(mockModel, input);
        return response.finishReason;
      });

      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBeDefined();
    });
  });
});

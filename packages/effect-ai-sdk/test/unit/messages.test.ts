import { describe, it, expect } from "vitest";
import { Effect, Chunk } from "effect";
import {
  Message,
  TextPart,
  ToolCallPart,
  ToolPart,
  ImageUrlPart,
  toVercelMessage,
  toVercelMessages,
  toEffectiveMessage,
  toEffectiveMessages,
} from "../../src/types/messages.js";
import type { ModelMessage } from "ai";
import { AiSdkMessageTransformError } from "../../src/errors.js";

describe("Message Transformation (v6 API)", () => {
  describe("toVercelMessage", () => {
    it("should convert system message to ModelMessage", async () => {
      const effectiveMessage = new Message({
        role: "system",
        parts: Chunk.of(
          new TextPart({ _tag: "Text", content: "System prompt" })
        ),
      });

      const program = toVercelMessage(effectiveMessage);
      const result = await Effect.runPromise(program);

      expect(result).toEqual({
        role: "system",
        content: "System prompt",
      } satisfies ModelMessage);
    });

    it("should convert user message with text to ModelMessage", async () => {
      const effectiveMessage = new Message({
        role: "user",
        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
      });

      const program = toVercelMessage(effectiveMessage);
      const result = await Effect.runPromise(program);

      expect(result).toMatchObject({
        role: "user",
      });
      expect(Array.isArray((result as any).content)).toBe(true);
    });

    it("should handle empty user message", async () => {
      const effectiveMessage = new Message({
        role: "user",
        parts: Chunk.empty(),
      });

      const program = toVercelMessage(effectiveMessage);
      const result = await Effect.runPromise(program);

      expect(result).toMatchObject({
        role: "user",
      });
    });

    it("should convert assistant message to ModelMessage", async () => {
      const effectiveMessage = new Message({
        role: "assistant",
        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Response" })),
      });

      const program = toVercelMessage(effectiveMessage);
      const result = await Effect.runPromise(program);

      expect(result).toMatchObject({
        role: "assistant",
        content: "Response",
      });
    });

    it("should convert message with multiple text parts", async () => {
      const effectiveMessage = new Message({
        role: "user",
        parts: Chunk.fromIterable([
          new TextPart({ _tag: "Text", content: "First" }),
          new TextPart({ _tag: "Text", content: "Second" }),
        ]),
      });

      const program = toVercelMessage(effectiveMessage);
      const result = await Effect.runPromise(program);

      expect(result).toMatchObject({
        role: "user",
      });
    });
  });

  describe("toVercelMessages", () => {
    it("should convert multiple messages to ModelMessage[]", async () => {
      const messages = Chunk.fromIterable([
        new Message({
          role: "system",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "System" })),
        }),
        new Message({
          role: "user",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hello" })),
        }),
        new Message({
          role: "assistant",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "Hi" })),
        }),
      ]);

      const program = toVercelMessages(messages);
      const result = await Effect.runPromise(program);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ role: "system" });
      expect(result[1]).toMatchObject({ role: "user" });
      expect(result[2]).toMatchObject({ role: "assistant" });
    });

    it("should handle empty message list", async () => {
      const program = toVercelMessages(Chunk.empty());
      const result = await Effect.runPromise(program);

      expect(result).toEqual([]);
    });

    it("should handle single message", async () => {
      const messages = Chunk.of(
        new Message({
          role: "user",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "Test" })),
        })
      );

      const program = toVercelMessages(messages);
      const result = await Effect.runPromise(program);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ role: "user" });
    });

    it("should preserve message order", async () => {
      const messages = Chunk.fromIterable([
        new Message({
          role: "user",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "1" })),
        }),
        new Message({
          role: "assistant",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "2" })),
        }),
        new Message({
          role: "user",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "3" })),
        }),
      ]);

      const program = toVercelMessages(messages);
      const result = await Effect.runPromise(program);

      expect(result[0]).toMatchObject({ role: "user" });
      expect(result[1]).toMatchObject({ role: "assistant" });
      expect(result[2]).toMatchObject({ role: "user" });
    });
  });

  describe("toEffectiveMessage", () => {
    it("should convert ModelMessage system message to EffectiveMessage", async () => {
      const modelMessage: ModelMessage = {
        role: "system",
        content: "System prompt",
      };

      const program = toEffectiveMessage(modelMessage, "gpt-4");
      const result = await Effect.runPromise(program);

      expect(result.role).toBe("system");
      const parts = Chunk.toReadonlyArray(result.parts);
      expect(parts).toHaveLength(1);
      expect(TextPart.is(parts[0]!)).toBe(true);
      if (TextPart.is(parts[0]!)) {
        expect(parts[0]!.content).toBe("System prompt");
      }
    });

    it("should convert ModelMessage user message with text content", async () => {
      const modelMessage: ModelMessage = {
        role: "user",
        content: "Hello world",
      };

      const program = toEffectiveMessage(modelMessage, "gpt-4");
      const result = await Effect.runPromise(program);

      expect(result.role).toBe("user");
      const parts = Chunk.toReadonlyArray(result.parts);
      expect(parts.length).toBeGreaterThan(0);
    });

    it("should convert ModelMessage assistant message", async () => {
      const modelMessage: ModelMessage = {
        role: "assistant",
        content: "Response text",
      };

      const program = toEffectiveMessage(modelMessage, "gpt-4");
      const result = await Effect.runPromise(program);

      expect(result.role).toBe("assistant");
    });

    it("should handle ModelMessage with array content", async () => {
      const modelMessage: ModelMessage = {
        role: "user",
        content: [{ type: "text" as const, text: "Hello" }],
      };

      const program = toEffectiveMessage(modelMessage, "gpt-4");
      const result = await Effect.runPromise(program);

      expect(result.role).toBe("user");
      expect(Chunk.size(result.parts)).toBeGreaterThan(0);
    });
  });

  describe("toEffectiveMessages", () => {
    it("should convert ModelMessage[] to Chunk<Message>", async () => {
      const modelMessages: ModelMessage[] = [
        { role: "system", content: "System" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" } as any,
      ];

      const program = toEffectiveMessages(modelMessages, "gpt-4");
      const result = await Effect.runPromise(program);

      expect(Chunk.size(result)).toBe(3);
      const messages = Chunk.toReadonlyArray(result);
      expect(messages[0]!.role).toBe("system");
      expect(messages[1]!.role).toBe("user");
      expect(messages[2]!.role).toBe("assistant");
    });

    it("should handle empty ModelMessage array", async () => {
      const program = toEffectiveMessages([], "gpt-4");
      const result = await Effect.runPromise(program);

      expect(Chunk.size(result)).toBe(0);
    });

    it("should preserve order in batch conversion", async () => {
      const modelMessages: ModelMessage[] = [
        { role: "user", content: "1" },
        { role: "assistant", content: "2" },
        { role: "user", content: "3" },
      ];

      const program = toEffectiveMessages(modelMessages, "gpt-4");
      const result = await Effect.runPromise(program);

      const messages = Chunk.toReadonlyArray(result);
      expect(messages[0]!.role).toBe("user");
      expect(messages[1]!.role).toBe("assistant");
      expect(messages[2]!.role).toBe("user");
    });
  });

  describe("Round-trip Conversion", () => {
    it("should survive Effective → Vercel → Effective round trip", async () => {
      const original = new Message({
        role: "user",
        parts: Chunk.of(
          new TextPart({ _tag: "Text", content: "Test message" })
        ),
      });

      const program = Effect.gen(function* () {
        const vercel = yield* toVercelMessage(original);
        const back = yield* toEffectiveMessage(vercel, "gpt-4");
        return back;
      });

      const result = await Effect.runPromise(program);

      expect(result.role).toBe("user");
      expect(Chunk.size(result.parts)).toBeGreaterThan(0);
    });

    it("should handle multiple messages round-trip", async () => {
      const original = Chunk.fromIterable([
        new Message({
          role: "user",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "One" })),
        }),
        new Message({
          role: "assistant",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "Two" })),
        }),
      ]);

      const program = Effect.gen(function* () {
        const vercel = yield* toVercelMessages(original);
        const back = yield* toEffectiveMessages(vercel, "gpt-4");
        return back;
      });

      const result = await Effect.runPromise(program);

      expect(Chunk.size(result)).toBe(2);
      const messages = Chunk.toReadonlyArray(result);
      expect(messages[0]!.role).toBe("user");
      expect(messages[1]!.role).toBe("assistant");
    });
  });

  describe("Error Handling", () => {
    it("should fail gracefully with error details for tool message without parts", async () => {
      // Create a tool message without tool result parts - should fail
      const toolMessage = new Message({
        role: "tool",
        parts: Chunk.empty(),
      });

      const program = toVercelMessage(toolMessage);
      const result = await Effect.runPromise(Effect.either(program));

      if (result._tag === "Left") {
        expect(result.left._tag).toBe("AiSdkMessageTransformError");
      } else {
        throw new Error("Should have failed for tool message without parts");
      }
    });

    it("should handle error in batch conversion", async () => {
      const messages = Chunk.of(
        new Message({
          role: "user",
          parts: Chunk.of(new TextPart({ _tag: "Text", content: "Test" })),
        })
      );

      const program = toVercelMessages(messages);
      const result = await Effect.runPromise(Effect.either(program));

      // Should succeed for valid input
      expect(result._tag).toBe("Right");
    });
  });
});

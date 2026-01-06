/* eslint-disable @typescript-eslint/no-explicit-any */

import { streamText as vercelStreamText, type LanguageModel } from "ai";
import type { Schema } from "effect";
import type { StreamController, StreamOptions } from "./types";

/**
 * Parse Server-Sent Events from a text stream
 */
function parseSSELine(line: string): Record<string, any> | null {
  if (!line.startsWith("data:")) {
    return null;
  }

  try {
    const json = line.slice(5).trim();
    if (json === "[DONE]") {
      return { done: true };
    }
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Adapter for OpenAI streaming
 */
export async function createOpenAIStreamAdapter(
  model: LanguageModel,
  options: StreamOptions,
  controller: StreamController
): Promise<void> {
  try {
    console.log(
      "[effect-ai-sdk] createOpenAIStreamAdapter: Starting vercelStreamText call"
    );
    console.log("[effect-ai-sdk] Model:", {
      type: typeof model,
      hasModelId: !!(model as any).modelId,
      modelId: (model as any).modelId || "unknown",
      keys: Object.keys(model || {}).slice(0, 5),
    });
    console.log("[effect-ai-sdk] Options:", {
      messageCount: options.messages?.length || 0,
      hasTemperature: options.temperature !== undefined,
      hasTopP: options.top_p !== undefined,
      hasSignal: !!options.signal,
    });

    const result = await vercelStreamText({
      model,
      messages: options.messages as any,
      ...(options.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
      ...(options.top_p !== undefined ? { topP: options.top_p } : {}),
      ...(options.signal !== undefined ? { abortSignal: options.signal } : {}),
    });

    console.log("[effect-ai-sdk] vercelStreamText returned successfully");
    console.log("[effect-ai-sdk] Result type:", typeof result);
    console.log(
      "[effect-ai-sdk] Result keys:",
      Object.keys(result || {}).slice(0, 10)
    );

    let fullText = "";

    // Get the response body as a ReadableStream
    console.log("[effect-ai-sdk] Calling result.toTextStreamResponse()...");
    const response = result.toTextStreamResponse();
    console.log("[effect-ai-sdk] Response obtained:", {
      type: typeof response,
      hasBody: !!response.body,
      bodyType: response.body?.constructor?.name,
      bodyLocked: response.body?.locked,
    });

    const reader = response.body?.getReader();
    console.log("[effect-ai-sdk] Reader obtained:", {
      hasReader: !!reader,
      readerType: reader?.constructor?.name,
    });

    if (!reader) {
      console.error(
        "[effect-ai-sdk] No reader available - response body is empty or streaming not supported"
      );
      controller.error(
        new Error("Response body is empty or streaming not supported")
      );
      return;
    }

    console.log("[effect-ai-sdk] Starting to read from response stream...");
    const decoder = new TextDecoder();

    try {
      let readCount = 0;
      while (true) {
        readCount++;
        console.log(`[effect-ai-sdk] Reading chunk ${readCount}...`);
        const { done, value } = await reader.read();
        console.log(`[effect-ai-sdk] Chunk ${readCount} result:`, {
          done,
          hasValue: !!value,
          valueType: value?.constructor?.name,
          valueLength: value?.length,
        });
        if (done) {
          console.log(
            `[effect-ai-sdk] Stream done after ${readCount} reads. Full text length: ${fullText.length}`
          );
          // Emit final message and complete events
          controller.enqueue({
            type: "final-message",
            text: fullText,
            timestamp: Date.now(),
            provider: "openai",
          } as const);

          controller.enqueue({
            type: "complete",
            timestamp: Date.now(),
            provider: "openai",
          } as const);
          break;
        }

        const decoded = decoder.decode(value, { stream: true });
        console.log(`[effect-ai-sdk] Decoded chunk ${readCount}:`, {
          decodedLength: decoded.length,
          decodedPreview: decoded.substring(0, 100),
        });

        // toTextStreamResponse() returns plain text, not SSE format
        // So we directly use the decoded text as token deltas
        if (decoded) {
          fullText += decoded;
          console.log(
            `[effect-ai-sdk] Emitting token-delta event. Full text length now: ${fullText.length}`
          );
          controller.enqueue({
            type: "token-delta",
            delta: decoded,
            timestamp: Date.now(),
            provider: "openai",
          } as const);
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error("[effect-ai-sdk] createOpenAIStreamAdapter error:", error);
    console.error("[effect-ai-sdk] Error type:", error?.constructor?.name);
    console.error(
      "[effect-ai-sdk] Error message:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "[effect-ai-sdk] Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    controller.error(error as Error);
  }
}

/**
 * Adapter for Anthropic streaming
 */
export async function createAnthropicStreamAdapter(
  model: LanguageModel,
  options: StreamOptions,
  controller: StreamController
): Promise<void> {
  try {
    const result = await vercelStreamText({
      model,
      messages: options.messages as any,
      ...(options.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
      ...(options.top_p !== undefined ? { topP: options.top_p } : {}),
      ...(options.signal !== undefined ? { abortSignal: options.signal } : {}),
    });

    let fullText = "";

    // Get the response body as a ReadableStream
    const response = result.toTextStreamResponse();
    const reader = response.body?.getReader();
    if (!reader) {
      controller.error(
        new Error("Response body is empty or streaming not supported")
      );
      return;
    }
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const data = parseSSELine(line.trim());
          if (!data) continue;

          if (data.done) {
            // Stream completed
            controller.enqueue({
              type: "final-message",
              text: fullText,
              raw: data,
              timestamp: Date.now(),
              provider: "anthropic",
            } as const);

            controller.enqueue({
              type: "complete",
              timestamp: Date.now(),
              provider: "anthropic",
            } as const);
            return;
          }

          const t = data?.type as
            | "content_block_delta"
            | "message_stop"
            | "content_block_start"
            | "ping"
            | undefined;

          if (!t) continue;

          switch (t) {
            case "content_block_delta": {
              const delta = data.delta?.text || "";
              if (delta) {
                fullText += delta;
                controller.enqueue({
                  type: "token-delta",
                  delta,
                  timestamp: Date.now(),
                  provider: "anthropic",
                } as const);
              }
              break;
            }
            case "message_stop": {
              controller.enqueue({
                type: "final-message",
                text: fullText,
                raw: data,
                timestamp: Date.now(),
                provider: "anthropic",
              } as const);

              controller.enqueue({
                type: "complete",
                timestamp: Date.now(),
                provider: "anthropic",
              } as const);
              break;
            }
            case "content_block_start":
            case "ping":
              // No action needed
              break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    controller.error(error as Error);
  }
}

/**
 * Adapter for streaming objects
 */
export async function createObjectStreamAdapter<T>(
  model: LanguageModel,
  options: StreamOptions & { schema: Schema.Schema<T, any, never> },
  controller: StreamController
): Promise<void> {
  try {
    // streamObject is deprecated in Vercel AI SDK v6, using streamText with output option instead
    const result = await vercelStreamText({
      model,
      messages: options.messages as any,
      output: {
        schema: options.schema as any,
      },
      temperature: options.temperature,
      topP: options.top_p,
      abortSignal: options.signal,
    } as any);

    let fullText = "";

    // Get the response body as a ReadableStream
    const response = result.toTextStreamResponse();
    const reader = response.body?.getReader();
    if (!reader) {
      controller.error(
        new Error("Response body is empty or streaming not supported")
      );
      return;
    }
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const data = parseSSELine(line.trim());
          if (!data) continue;

          if (data.done) {
            // Stream completed - attempt to parse final object
            try {
              const parsed = JSON.parse(fullText);
              controller.enqueue({
                type: "final-message",
                text: fullText,
                raw: { object: parsed, ...data },
                timestamp: Date.now(),
                provider: options.provider,
              } as const);
            } catch (parseError) {
              // If parsing fails, still emit final message
              controller.enqueue({
                type: "final-message",
                text: fullText,
                raw: data,
                timestamp: Date.now(),
                provider: options.provider,
              } as const);
            }

            controller.enqueue({
              type: "complete",
              timestamp: Date.now(),
              provider: options.provider,
            } as const);
            return;
          }

          const t = data?.type as
            | "content_block_delta"
            | "message_stop"
            | "content_block_start"
            | "ping"
            | undefined;

          if (!t) continue;

          switch (t) {
            case "content_block_delta": {
              const delta = data.delta?.text || "";
              if (delta) {
                fullText += delta;
                controller.enqueue({
                  type: "token-delta",
                  delta,
                  timestamp: Date.now(),
                  provider: options.provider,
                } as const);
              }
              break;
            }
            case "message_stop": {
              // For object streaming, try to parse the accumulated text
              try {
                const parsed = JSON.parse(fullText);
                controller.enqueue({
                  type: "final-message",
                  text: fullText,
                  raw: { object: parsed, ...data },
                  timestamp: Date.now(),
                  provider: options.provider,
                } as const);
              } catch (parseError) {
                controller.enqueue({
                  type: "error",
                  error: parseError as Error,
                  timestamp: Date.now(),
                  provider: options.provider,
                } as const);
              }

              controller.enqueue({
                type: "complete",
                timestamp: Date.now(),
                provider: options.provider,
              } as const);
              break;
            }
            case "content_block_start":
            case "ping":
              // No action needed
              break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    controller.error(error as Error);
  }
}

import type { LanguageModel } from "ai";
import { Chunk, Effect, Schema } from "effect";
import {
  Message as EffectiveMessage,
  TextPart,
  createProvider,
  getLanguageModel,
  streamText,
  toVercelMessages,
  type ProviderName,
} from "effect-ai-sdk";
import { Message } from "../actors/ThreadActor";

/**
 * Configuration for ChatRuntime
 */
export interface ChatRuntimeConfig {
  provider?: "openai" | "anthropic";
  model?: string;
  systemPrompt?: string;
}

/**
 * ChatRuntime API interface
 */
export interface ChatRuntimeApi {
  generateResponse: (
    messages: readonly Message[]
  ) => Effect.Effect<string, Error>;
  streamResponse: (messages: readonly Message[]) => AsyncIterable<string>;
}

/**
 * Convert ThreadActor Message to EffectiveMessage
 */
function toEffectiveMessage(message: Message): EffectiveMessage {
  const role = message.role === "assistant" ? "model" : message.role;
  const parts = Chunk.of(
    new TextPart({ _tag: "Text", content: message.content })
  );
  return new EffectiveMessage({ role, parts });
}

/**
 * Convert ThreadActor Message[] to EffectiveMessage Chunk
 */
function toEffectiveMessages(
  messages: readonly Message[]
): Chunk.Chunk<EffectiveMessage> {
  return Chunk.fromIterable(messages.map(toEffectiveMessage));
}

/**
 * Environment schema for chat app configuration
 */
const ChatEnvSchema = Schema.Struct({
  VITE_OPENAI_API_KEY: Schema.optional(Schema.String),
  VITE_ANTHROPIC_API_KEY: Schema.optional(Schema.String),
  VITE_AI_PROVIDER: Schema.optional(Schema.String),
  VITE_AI_MODEL: Schema.optional(Schema.String),
  VITE_SYSTEM_PROMPT: Schema.optional(Schema.String),
});

/**
 * Get environment values from Vite's import.meta.env
 * Returns parsed values directly to avoid Effect TypeId mismatch between monorepos
 */
function getViteEnvValues(): Schema.Schema.Type<typeof ChatEnvSchema> {
  const viteEnv: Record<string, string | undefined> = {};
  if (typeof import.meta !== "undefined" && import.meta.env) {
    for (const key in import.meta.env) {
      viteEnv[key] = import.meta.env[key] as string | undefined;
    }
  }

  // Parse schema synchronously (skipValidation=true means we can use empty object on error)
  try {
    return Schema.decodeUnknownSync(ChatEnvSchema)(viteEnv);
  } catch {
    return {} as Schema.Schema.Type<typeof ChatEnvSchema>;
  }
}

/**
 * Get provider and model from environment variables using effect-ai-sdk
 * Accesses parsed values directly to avoid Effect TypeId mismatch
 */
function getProviderConfig(): Effect.Effect<
  { provider: LanguageModel; modelName: string },
  Error | never
> {
  return Effect.gen(function* () {
    const envValues = getViteEnvValues();
    const openaiKey = envValues.VITE_OPENAI_API_KEY;
    const anthropicKey = envValues.VITE_ANTHROPIC_API_KEY;
    const providerEnv = envValues.VITE_AI_PROVIDER;
    const modelEnv = envValues.VITE_AI_MODEL;

    // Determine provider name
    let providerName: ProviderName;
    if (providerEnv === "anthropic" && anthropicKey) {
      providerName = "anthropic";
    } else if (providerEnv === "openai" && openaiKey) {
      providerName = "openai";
    } else if (openaiKey) {
      providerName = "openai";
    } else if (anthropicKey) {
      providerName = "anthropic";
    } else {
      return yield* Effect.fail(
        new Error(
          "No API key found. Please set VITE_OPENAI_API_KEY or VITE_ANTHROPIC_API_KEY in your .env.local file"
        )
      );
    }

    // Get the API key for the selected provider
    const apiKey = providerName === "openai" ? openaiKey : anthropicKey;
    if (!apiKey) {
      return yield* Effect.fail(
        new Error(`API key not found for provider: ${providerName}`)
      );
    }

    // Log API key configuration (masked for security)
    const maskedKey =
      apiKey.length > 8
        ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
        : "***";
    console.log("=== PROVIDER CONFIGURATION ===");
    console.log("Provider:", providerName);
    console.log("API Key (masked):", maskedKey);
    console.log("API Key length:", apiKey.length);
    console.log("API Key starts with 'sk-':", apiKey.startsWith("sk-"));

    // Create provider instance using effect-ai-sdk's createProvider
    const provider = yield* createProvider(providerName, {
      apiKey,
    });
    console.log("✓ Provider created:", typeof provider);

    // Determine model name
    const modelName =
      modelEnv ||
      (providerName === "openai" ? "gpt-4o" : "claude-3-5-sonnet-20241022");

    // Get language model using effect-ai-sdk's getLanguageModel
    const model = yield* getLanguageModel(provider, modelName);

    // Log model configuration for debugging
    console.log("Model obtained:", {
      modelId: (model as any).modelId || "unknown",
      providerType: providerName,
      modelName,
      hasProvider: !!provider,
    });

    return { provider: model, modelName };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(
        new Error(
          `Failed to initialize provider: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      )
    )
  );
}

/**
 * ChatRuntime - handles AI text generation and streaming
 */
export class ChatRuntime extends Effect.Service<ChatRuntime>()(
  "chat/ChatRuntime",
  {
    effect: Effect.fn(function* (config?: ChatRuntimeConfig) {
      // Get provider configuration
      const { provider: model, modelName } = yield* getProviderConfig();

      // Store modelName in closure for logging
      const currentModelName = modelName;

      // Get system prompt from environment (access parsed values directly)
      const envValues = getViteEnvValues();
      const systemPrompt = config?.systemPrompt || envValues.VITE_SYSTEM_PROMPT;

      return {
        generateResponse: (messages: readonly Message[]) =>
          Effect.gen(function* () {
            // Convert messages to EffectiveMessage format
            const effectiveMessages = toEffectiveMessages(messages);
            const vercelMessages = yield* toVercelMessages(effectiveMessages);

            // Use streaming and collect the result
            const streamOptions: any = {
              messages: vercelMessages as any,
            };
            if (systemPrompt) {
              streamOptions.system = systemPrompt;
            }

            const streamHandle = streamText(model, streamOptions);

            // Collect all text from stream using Effect.tryPromise
            const text: string = yield* Effect.tryPromise({
              try: () => streamHandle.collectText(),
              catch: (error) =>
                new Error(
                  `Failed to collect text: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                ),
            });
            return text;
          }),

        streamResponse: async function* (messages: readonly Message[]) {
          try {
            // Validate messages are not empty
            if (!messages || messages.length === 0) {
              throw new Error(
                "Cannot stream response: messages array is empty"
              );
            }

            // Convert messages to EffectiveMessage format
            const effectiveMessages = toEffectiveMessages(messages);

            // Validate conversion produced messages
            const effectiveArray = Chunk.toReadonlyArray(effectiveMessages);
            if (effectiveArray.length === 0) {
              throw new Error("Message conversion produced empty array");
            }

            // Convert to Vercel messages using Effect
            const vercelMessages = await Effect.runPromise(
              toVercelMessages(effectiveMessages).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(
                    new Error(
                      `Failed to convert messages: ${
                        error instanceof Error ? error.message : String(error)
                      }`
                    )
                  )
                )
              )
            );

            // Validate Vercel messages are not empty
            if (!vercelMessages || vercelMessages.length === 0) {
              throw new Error("Vercel message conversion produced empty array");
            }

            // Create stream handle
            const streamOptions: any = {
              messages: vercelMessages as any,
            };
            if (systemPrompt) {
              streamOptions.system = systemPrompt;
            }

            console.log("=== STREAM CREATION ===");
            console.log("Creating stream handle with options:", {
              messageCount: vercelMessages.length,
              hasSystemPrompt: !!systemPrompt,
              modelName: currentModelName,
              messages: vercelMessages.map((m: any) => ({
                role: m.role,
                content:
                  typeof m.content === "string"
                    ? m.content.substring(0, 50)
                    : "non-string",
              })),
            });

            // Verify model configuration
            console.log("Model details:", {
              modelId: (model as any).modelId || (model as any).id || "unknown",
              providerType: typeof model,
              modelKeys: Object.keys(model || {}).slice(0, 10),
            });
            console.log("Stream options being passed to streamText:", {
              messageCount: streamOptions.messages?.length,
              hasSystem: !!streamOptions.system,
              hasTemperature: "temperature" in streamOptions,
              hasTopP: "topP" in streamOptions,
            });

            // Create the stream handle - this doesn't make the API call yet
            // The API call happens lazily when we first read from the stream
            const streamHandle = streamText(model, streamOptions);
            console.log("✓ Stream handle created");
            console.log("✓ Stream readable:", !!streamHandle.readable);
            console.log(
              "✓ Stream readable.locked:",
              streamHandle.readable.locked
            );
            console.log(
              "→ Next: Getting reader will trigger stream start() function"
            );

            // Read from stream and yield text chunks
            const reader = streamHandle.readable.getReader();
            console.log("✓ Reader obtained");
            console.log(
              "✓ Stream readable.locked (should be true):",
              streamHandle.readable.locked
            );

            let buffer = "";
            let hasYielded = false;
            let readCount = 0;
            let streamStarted = false;
            const startTime = Date.now();

            try {
              // Add a timeout to detect hanging streams
              const timeoutId = setTimeout(() => {
                console.error(
                  "Stream read timeout after 30 seconds - canceling reader"
                );
                console.error(
                  "This usually means the API call is hanging or failed silently."
                );
                reader.cancel(new Error("Stream timeout after 30 seconds"));
              }, 30000);

              console.log("=== STARTING STREAM READ LOOP ===");
              while (true) {
                readCount++;
                const readStartTime = Date.now();

                if (readCount === 1) {
                  console.log("--- FIRST READ (triggers API call) ---");
                  console.log(`Model: ${currentModelName}`);
                  console.log(
                    "Calling reader.read() - this will trigger stream start() function"
                  );
                  console.log(
                    "The stream's start() function will call createOpenAIStreamAdapter/createAnthropicStreamAdapter"
                  );
                  console.log(
                    "Which will call vercelStreamText() to make the actual API request"
                  );
                } else {
                  console.log(`--- READ ATTEMPT ${readCount} ---`);
                }

                let readResult;
                try {
                  // The stream's start() function is called lazily on first read
                  // This is when the actual API call to OpenAI/Anthropic happens
                  // If the API call fails, it should error here via controller.error()
                  const readPromise = reader.read();

                  // Track if stream has started (start() function has been called)
                  if (!streamStarted) {
                    streamStarted = true;
                    console.log(
                      "✓ Stream start() function invoked (API call should begin now)"
                    );
                    console.log("→ Waiting for API response...");
                    console.log(
                      "→ Check Network tab for request to api.openai.com or api.anthropic.com"
                    );
                  }

                  console.log("Awaiting reader.read() promise...");
                  readResult = await readPromise;
                  const readDuration = Date.now() - readStartTime;
                  console.log(`✓ Read completed in ${readDuration}ms`);
                } catch (readErr) {
                  const readDuration = Date.now() - readStartTime;
                  console.error("=== READ ERROR ===");
                  console.error(`Error after ${readDuration}ms:`, readErr);
                  console.error("Error type:", readErr?.constructor?.name);
                  console.error(
                    "Error message:",
                    readErr instanceof Error ? readErr.message : String(readErr)
                  );
                  console.error(
                    "Error stack:",
                    readErr instanceof Error ? readErr.stack : "No stack"
                  );
                  clearTimeout(timeoutId);
                  // Re-throw with more context
                  const error =
                    readErr instanceof Error
                      ? readErr
                      : new Error(String(readErr));
                  throw new Error(
                    `Stream read failed after ${readDuration}ms: ${error.message}. ` +
                      `This usually means the API call failed. Check your API key and network connection. ` +
                      `Check the browser Network tab to see if the API request was made.`
                  );
                }

                const { done, value } = readResult;

                console.log(`Read result:`, {
                  done,
                  hasValue: !!value,
                  valueType: value?.type,
                  valueKeys: value ? Object.keys(value) : [],
                });

                if (done) {
                  const totalDuration = Date.now() - startTime;
                  console.log("=== STREAM COMPLETED ===");
                  console.log(`Total duration: ${totalDuration}ms`);
                  console.log(`Read attempts: ${readCount}`);
                  console.log(`Buffer length: ${buffer.length}`);
                  console.log(`Has yielded: ${hasYielded}`);
                  console.log(`Stream started: ${streamStarted}`);
                  clearTimeout(timeoutId);

                  // If we haven't yielded anything and we have buffer, yield it
                  if (!hasYielded && buffer) {
                    console.log(
                      "Yielding final buffer:",
                      buffer.substring(0, 100)
                    );
                    yield buffer;
                    hasYielded = true;
                  }
                  break;
                }

                console.log("--- PROCESSING STREAM VALUE ---");
                console.log("Value details:", {
                  type: value?.type,
                  hasDelta: value && "delta" in value,
                  hasText: value && "text" in value,
                  valueKeys: value ? Object.keys(value) : [],
                  deltaLength:
                    value && "delta" in value
                      ? (value.delta as string).length
                      : 0,
                  textLength:
                    value && "text" in value
                      ? (value.text as string)?.length
                      : 0,
                });

                // Handle token-delta events
                if (value?.type === "token-delta") {
                  buffer += value.delta;
                  console.log(
                    `✓ Token-delta received: ${value.delta.length} chars`
                  );
                  console.log(`Preview: "${value.delta.substring(0, 50)}"`);
                  console.log(`Total buffer: ${buffer.length} chars`);
                  console.log("→ Yielding chunk to caller");
                  yield value.delta;
                  hasYielded = true;
                  console.log("✓ Chunk yielded");
                } else if (value?.type === "final-message") {
                  console.log("✓ Final-message received");
                  console.log(`Text length: ${value.text?.length}`);
                  console.log(`Current buffer length: ${buffer.length}`);
                  // If we get a final message, yield any remaining buffer
                  if (buffer !== value.text) {
                    const remaining = value.text.slice(buffer.length);
                    if (remaining) {
                      console.log(
                        `Yielding remaining: ${remaining.length} chars`
                      );
                      console.log(`Preview: "${remaining.substring(0, 100)}"`);
                      yield remaining;
                      hasYielded = true;
                    }
                  }
                  buffer = value.text;
                  console.log(
                    `✓ Buffer updated to final text (${buffer.length} chars)`
                  );
                } else if (value?.type === "complete") {
                  // Stream completion signal - we can break here
                  console.log("✓ Stream completion signal received");
                  break;
                } else if (value?.type === "error") {
                  console.error("=== STREAM ERROR EVENT ===");
                  console.error("Error:", value.error);
                  throw value.error;
                } else {
                  console.warn("⚠ Unhandled stream event type:", value?.type);
                  console.warn("Full value:", value);
                  console.warn("This event type is not being processed");
                }
              }

              clearTimeout(timeoutId);

              // If we never yielded anything, provide a more helpful error
              if (!hasYielded) {
                const totalDuration = Date.now() - startTime;
                console.error("=== NO CONTENT RECEIVED ===");
                console.error(`Stream completed after ${totalDuration}ms`);
                console.error(`Read attempts: ${readCount}`);
                console.error(`Buffer length: ${buffer.length}`);
                console.error(`Stream started: ${streamStarted}`);
                console.error("Possible causes:");
                console.error(
                  "1. API call failed silently (check Network tab)"
                );
                console.error("2. API key is invalid or expired");
                console.error("3. Network/CORS issue preventing API call");
                console.error("4. Stream adapter failed to enqueue events");
                throw new Error(
                  `Stream completed but no content was received after ${readCount} read attempts (${totalDuration}ms). ` +
                    `This usually means the API call failed or returned an empty response. ` +
                    `Check your API key and network connection. ` +
                    `Check the browser Network tab to see if the API request was made.`
                );
              } else {
                const totalDuration = Date.now() - startTime;
                console.log("=== STREAM SUCCESS ===");
                console.log(`Total duration: ${totalDuration}ms`);
                console.log(`Total chunks yielded: ${readCount}`);
                console.log(`Final buffer length: ${buffer.length}`);
              }
            } catch (streamError) {
              const totalDuration = Date.now() - startTime;
              console.error("=== STREAM ERROR ===");
              console.error(`Error after ${totalDuration}ms`);
              console.error("Error:", streamError);
              console.error("Error details:", {
                message:
                  streamError instanceof Error
                    ? streamError.message
                    : String(streamError),
                stack:
                  streamError instanceof Error ? streamError.stack : undefined,
                readCount,
                hasYielded,
                bufferLength: buffer.length,
                streamStarted,
              });
              throw streamError;
            } finally {
              reader.releaseLock();
              console.log("✓ Stream reader released");
              console.log("=== STREAM CLEANUP COMPLETE ===");
            }
          } catch (error) {
            throw error instanceof Error ? error : new Error(String(error));
          }
        },
      } satisfies ChatRuntimeApi;
    }),
    dependencies: [],
  }
) {}

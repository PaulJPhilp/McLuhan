import type { LanguageModel, ModelMessage } from "ai";
import { Chunk, Effect } from "effect";
import { streamText, toVercelMessages } from "effect-ai-sdk";
import type { Message } from "../../actors/ThreadActor.js";
import { logDebug, logError, logWarn } from "../../utils/logger.js";
import { getViteEnvValues } from "../ConfigService/index.js";
import type { ChatRuntimeApi } from "./api.js";
import { getProviderConfig, toEffectiveMessages } from "./helpers.js";
import type { ChatRuntimeConfig } from "./types.js";

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
		if ("id" in model && typeof model.id === "string") {
			return model.id;
		}
	}
	return "unknown";
}

/**
 * ChatRuntime - handles AI text generation and streaming
 */
export class ChatRuntime extends Effect.Service<ChatRuntime>()(
	"chat/ChatRuntime",
	{
		effect: Effect.fn(function* (_config?: ChatRuntimeConfig) {
			// Get provider configuration
			const { provider: model, modelName } = yield* getProviderConfig();

			// Store modelName in closure for logging
			const currentModelName = modelName;

			// Get system prompt from environment (access parsed values directly)
			const envValues = getViteEnvValues();
			const systemPrompt =
				_config?.systemPrompt || envValues.VITE_SYSTEM_PROMPT;

			return {
				generateResponse: (messages: readonly Message[]) =>
					Effect.gen(function* () {
						// Convert messages to EffectiveMessage format
						const effectiveMessages = toEffectiveMessages(messages);
						const vercelMessages: ModelMessage[] =
							yield* toVercelMessages(effectiveMessages);

						// Use streaming and collect the result
						// streamText accepts Omit<StreamOptions, "provider"> where StreamOptions is from effect-ai-sdk internal types
						const streamOptions: {
							messages: Array<
								| { role: "system" | "user" | "assistant"; content: string }
								| Record<string, unknown>
							>;
							system?: string;
							model: string;
						} = {
							messages: vercelMessages as Array<
								| { role: "system" | "user" | "assistant"; content: string }
								| Record<string, unknown>
							>,
							model: currentModelName,
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
									}`,
								),
						});
						return text;
					}),

				streamResponse: async function* (messages: readonly Message[]) {
					try {
						// Validate messages are not empty
						if (!messages || messages.length === 0) {
							throw new Error(
								"Cannot stream response: messages array is empty",
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
											}`,
										),
									),
								),
							),
						);

						// Validate Vercel messages are not empty
						if (!vercelMessages || vercelMessages.length === 0) {
							throw new Error("Vercel message conversion produced empty array");
						}

						// Create stream handle
						// streamText accepts Omit<StreamOptions, "provider"> where StreamOptions is from effect-ai-sdk internal types
						const streamOptions: {
							messages: Array<
								| { role: "system" | "user" | "assistant"; content: string }
								| Record<string, unknown>
							>;
							system?: string;
							model: string;
						} = {
							messages: vercelMessages as Array<
								| { role: "system" | "user" | "assistant"; content: string }
								| Record<string, unknown>
							>,
							model: currentModelName,
						};
						if (systemPrompt) {
							streamOptions.system = systemPrompt;
						}

						logDebug("=== STREAM CREATION ===");
						logDebug("Creating stream handle with options:", {
							messageCount: vercelMessages.length,
							hasSystemPrompt: !!systemPrompt,
							modelName: currentModelName,
							messages: vercelMessages.map((m) => ({
								role: m.role,
								content:
									typeof m.content === "string"
										? m.content.substring(0, 50)
										: "non-string",
							})),
						});

						// Verify model configuration
						logDebug("Model details:", {
							modelId: getModelId(model),
							providerType: typeof model,
							modelKeys:
								typeof model === "object" && model !== null
									? Object.keys(model).slice(0, 10)
									: [],
						});
						logDebug("Stream options being passed to streamText:", {
							messageCount: streamOptions.messages?.length,
							hasSystem: !!streamOptions.system,
							hasTemperature: "temperature" in streamOptions,
							hasTopP: "topP" in streamOptions,
						});

						// Create the stream handle - this doesn't make the API call yet
						// The API call happens lazily when we first read from the stream
						const streamHandle = streamText(model, streamOptions);
						logDebug("✓ Stream handle created");
						logDebug("✓ Stream readable:", !!streamHandle.readable);
						logDebug("✓ Stream readable.locked:", streamHandle.readable.locked);
						logDebug(
							"→ Next: Getting reader will trigger stream start() function",
						);

						// Read from stream and yield text chunks
						const reader = streamHandle.readable.getReader();
						logDebug("✓ Reader obtained");
						logDebug(
							"✓ Stream readable.locked (should be true):",
							streamHandle.readable.locked,
						);

						let buffer = "";
						let hasYielded = false;
						let readCount = 0;
						let streamStarted = false;
						const startTime = Date.now();

						try {
							// Add a timeout to detect hanging streams
							const timeoutId = setTimeout(() => {
								logError(
									"Stream read timeout after 30 seconds - canceling reader",
								);
								logError(
									"This usually means the API call is hanging or failed silently.",
								);
								reader.cancel(new Error("Stream timeout after 30 seconds"));
							}, 30000);

							logDebug("=== STARTING STREAM READ LOOP ===");
							while (true) {
								readCount++;
								const readStartTime = Date.now();

								if (readCount === 1) {
									logDebug("--- FIRST READ (triggers API call) ---");
									logDebug(`Model: ${currentModelName}`);
									logDebug(
										"Calling reader.read() - this will trigger stream start() function",
									);
									logDebug(
										"The stream's start() function will call createOpenAIStreamAdapter/createAnthropicStreamAdapter",
									);
									logDebug(
										"Which will call vercelStreamText() to make the actual API request",
									);
								} else {
									logDebug(`--- READ ATTEMPT ${readCount} ---`);
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
										logDebug(
											"✓ Stream start() function invoked (API call should begin now)",
										);
										logDebug("→ Waiting for API response...");
										logDebug(
											"→ Check Network tab for request to api.openai.com or api.anthropic.com",
										);
									}

									logDebug("Awaiting reader.read() promise...");
									readResult = await readPromise;
									const readDuration = Date.now() - readStartTime;
									logDebug(`✓ Read completed in ${readDuration}ms`);
								} catch (readErr) {
									const readDuration = Date.now() - readStartTime;
									logError("=== READ ERROR ===");
									logError(`Error after ${readDuration}ms:`, readErr);
									logError("Error type:", readErr?.constructor?.name);
									logError(
										"Error message:",
										readErr instanceof Error
											? readErr.message
											: String(readErr),
									);
									logError(
										"Error stack:",
										readErr instanceof Error ? readErr.stack : "No stack",
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
											`Check the browser Network tab to see if the API request was made.`,
									);
								}

								const { done, value } = readResult;

								logDebug(`Read result:`, {
									done,
									hasValue: !!value,
									valueType: value?.type,
									valueKeys: value ? Object.keys(value) : [],
								});

								if (done) {
									const totalDuration = Date.now() - startTime;
									logDebug("=== STREAM COMPLETED ===");
									logDebug(`Total duration: ${totalDuration}ms`);
									logDebug(`Read attempts: ${readCount}`);
									logDebug(`Buffer length: ${buffer.length}`);
									logDebug(`Has yielded: ${hasYielded}`);
									logDebug(`Stream started: ${streamStarted}`);
									clearTimeout(timeoutId);

									// If we haven't yielded anything and we have buffer, yield it
									if (!hasYielded && buffer) {
										logDebug(
											"Yielding final buffer:",
											buffer.substring(0, 100),
										);
										yield buffer;
										hasYielded = true;
									}
									break;
								}

								logDebug("--- PROCESSING STREAM VALUE ---");
								logDebug("Value details:", {
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
									logDebug(
										`✓ Token-delta received: ${value.delta.length} chars`,
									);
									logDebug(`Preview: "${value.delta.substring(0, 50)}"`);
									logDebug(`Total buffer: ${buffer.length} chars`);
									logDebug("→ Yielding chunk to caller");
									yield value.delta;
									hasYielded = true;
									logDebug("✓ Chunk yielded");
								} else if (value?.type === "final-message") {
									logDebug("✓ Final-message received");
									logDebug(`Text length: ${value.text?.length}`);
									logDebug(`Current buffer length: ${buffer.length}`);
									// If we get a final message, yield any remaining buffer
									if (buffer !== value.text) {
										const remaining = value.text.slice(buffer.length);
										if (remaining) {
											logDebug(`Yielding remaining: ${remaining.length} chars`);
											logDebug(`Preview: "${remaining.substring(0, 100)}"`);
											yield remaining;
											hasYielded = true;
										}
									}
									buffer = value.text;
									logDebug(
										`✓ Buffer updated to final text (${buffer.length} chars)`,
									);
								} else if (value?.type === "complete") {
									// Stream completion signal - we can break here
									logDebug("✓ Stream completion signal received");
									break;
								} else if (value?.type === "error") {
									logError("=== STREAM ERROR EVENT ===");
									logError("Error:", value.error);
									throw value.error;
								} else {
									logWarn("⚠ Unhandled stream event type:", value?.type);
									logWarn("Full value:", value);
									logWarn("This event type is not being processed");
								}
							}

							clearTimeout(timeoutId);

							// If we never yielded anything, provide a more helpful error
							if (!hasYielded) {
								const totalDuration = Date.now() - startTime;
								logError("=== NO CONTENT RECEIVED ===");
								logError(`Stream completed after ${totalDuration}ms`);
								logError(`Read attempts: ${readCount}`);
								logError(`Buffer length: ${buffer.length}`);
								logError(`Stream started: ${streamStarted}`);
								logError("Possible causes:");
								logError("1. API call failed silently (check Network tab)");
								logError("2. API key is invalid or expired");
								logError("3. Network/CORS issue preventing API call");
								logError("4. Stream adapter failed to enqueue events");
								throw new Error(
									`Stream completed but no content was received after ${readCount} read attempts (${totalDuration}ms). ` +
										`This usually means the API call failed or returned an empty response. ` +
										`Check your API key and network connection. ` +
										`Check the browser Network tab to see if the API request was made.`,
								);
							} else {
								const totalDuration = Date.now() - startTime;
								logDebug("=== STREAM SUCCESS ===");
								logDebug(`Total duration: ${totalDuration}ms`);
								logDebug(`Total chunks yielded: ${readCount}`);
								logDebug(`Final buffer length: ${buffer.length}`);
							}
						} catch (streamError) {
							const totalDuration = Date.now() - startTime;
							logError("=== STREAM ERROR ===");
							logError(`Error after ${totalDuration}ms`);
							logError("Error:", streamError);
							logError("Error details:", {
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
							logDebug("✓ Stream reader released");
							logDebug("=== STREAM CLEANUP COMPLETE ===");
						}
					} catch (error) {
						throw error instanceof Error ? error : new Error(String(error));
					}
				},
			} satisfies ChatRuntimeApi;
		}),
		dependencies: [],
	},
) {}

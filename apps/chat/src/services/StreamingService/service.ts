import { Effect } from "effect";
import { ChatRuntime } from "../ChatRuntime/index.js";
import { ArtifactExtractionService } from "../ArtifactExtractionService/index.js";
import { ArtifactStorageService } from "../ArtifactStorageService/index.js";
import type { StreamingServiceApi } from "./api.js";
import {
	EmptyStreamError,
	InvalidMessagesError,
	StreamError,
	StreamTimeoutError,
} from "./errors.js";
import type { StreamChatOptions, StreamResult } from "./types.js";

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * StreamingService - handles AI response streaming orchestration
 */
export class StreamingService extends Effect.Service<StreamingService>()(
	"chat/StreamingService",
	{
		effect: Effect.fn(function* () {
			// Get dependencies at service construction time
			const chatRuntime = yield* ChatRuntime;
			const artifactExtraction = yield* ArtifactExtractionService;
			const artifactStorage = yield* ArtifactStorageService;

			return {
				streamChat: (options: StreamChatOptions) =>
					Effect.gen(function* () {
						const {
							messages,
							messageId,
							modelProvider,
							modelId,
							onChunk,
							onComplete,
							onError,
							timeoutMs = DEFAULT_TIMEOUT_MS,
						} = options;

						// Validate messages
						if (!messages || messages.length === 0) {
							return yield* Effect.fail(
								new InvalidMessagesError({
									message: "Cannot stream response: messages array is empty",
								}),
							);
						}

						const startTime = Date.now();
						let accumulatedContent = "";
						let chunkCount = 0;

						// Create the stream
						const streamIterable = chatRuntime.streamResponse(messages);

						// Process stream with timeout
						const processStream = Effect.async<
							string,
							StreamError | StreamTimeoutError | EmptyStreamError
						>((resume) => {
							let timeoutId: ReturnType<typeof setTimeout> | null = null;
							let isCompleted = false;

							const cleanup = () => {
								if (timeoutId) {
									clearTimeout(timeoutId);
									timeoutId = null;
								}
							};

							// Set up timeout
							timeoutId = setTimeout(() => {
								if (!isCompleted) {
									isCompleted = true;
									const error = new StreamTimeoutError({
										message: `Stream timed out after ${timeoutMs}ms`,
										timeoutMs,
										chunkCount,
									});
									if (onError) {
										onError(error);
									}
									resume(Effect.fail(error));
								}
							}, timeoutMs);

							// Process the stream
							(async () => {
								try {
									for await (const chunk of streamIterable) {
										if (isCompleted) break;

										chunkCount++;
										accumulatedContent += chunk;

										// Call onChunk callback if provided
										if (onChunk) {
											onChunk(chunk, accumulatedContent);
										}
									}

									cleanup();

									if (isCompleted) return;
									isCompleted = true;

									// Validate we received content
									if (accumulatedContent.length === 0) {
										const error = new EmptyStreamError({
											message:
												"Stream completed but no content was received. Check API key and network connection.",
											durationMs: Date.now() - startTime,
										});
										if (onError) {
											onError(error);
										}
										resume(Effect.fail(error));
										return;
									}

									resume(Effect.succeed(accumulatedContent));
								} catch (error) {
									cleanup();

									if (isCompleted) return;
									isCompleted = true;

									const streamError =
										error instanceof Error ? error : new Error(String(error));
									if (onError) {
										onError(streamError);
									}

									resume(
										Effect.fail(
											new StreamError({
												message: streamError.message,
												cause: error,
											}),
										),
									);
								}
							})();

							// Return cleanup function
							return Effect.sync(() => {
								cleanup();
								isCompleted = true;
							});
						});

						const content = yield* processStream;

						const durationMs = Date.now() - startTime;

						// Extract and store artifacts if messageId is provided
						if (messageId && content.length > 0) {
							yield* artifactExtraction
								.extractFromContent(content, modelProvider, modelId)
								.pipe(
									Effect.flatMap((artifacts) =>
										artifacts.length > 0
											? artifactStorage.saveArtifacts(messageId, artifacts)
											: Effect.void,
									),
									Effect.tap(() =>
										console.log(`Artifact processing complete for ${messageId}`),
									),
									// Log but don't fail - artifact extraction shouldn't break streaming
									Effect.catchAll((error) => {
										console.warn(
											"Failed to extract or store artifacts:",
											error instanceof Error ? error.message : String(error),
										);
										return Effect.void;
									}),
								);
						}

						// Call onComplete callback if provided
						if (onComplete) {
							onComplete(content);
						}

						const result: StreamResult = {
							content,
							chunkCount,
							durationMs,
						};

						return result;
					}),
			} satisfies StreamingServiceApi;
		}),
		dependencies: [
			ChatRuntime.Default(),
			ArtifactExtractionService.Default(),
			ArtifactStorageService.Default(),
		],
	},
) {}

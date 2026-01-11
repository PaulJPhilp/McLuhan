import { Result, useAtomRefresh, useAtomValue } from "@effect-atom/atom-react";
import { Effect } from "effect";
import {
	FC,
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useState,
} from "react";
import type {
	Message,
	ThreadMessage,
	ThreadState,
} from "../actors/ThreadActor.js";
import { MultiModelStreamingService } from "../services/MultiModelStreamingService/index.js";
import { ModelConfigService } from "../services/ModelConfigService/index.js";
import { StreamingService } from "../services/StreamingService/index.js";
import { ThreadService } from "../services/ThreadService/index.js";
import { sharedRuntime } from "./atomRuntime.js";
import { threadStateAtom } from "./threadAtom.js";

/**
 * Chat context for providing services to components
 */
interface ChatContextValue {
	// Thread state
	state: ThreadState;
	messages: readonly Message[];
	isLoading: boolean;
	loadingModels: readonly string[]; // Model IDs that are currently loading
	error: string | null;

	// Thread actions
	addMessage: (
		role: "user" | "assistant" | "system",
		content: string,
	) => Promise<void>;
	clearMessages: () => Promise<void>;
	retryLastMessage: () => Promise<void>;

	// Chat runtime
	sendMessage: (content: string, modelIds?: string[]) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const useChatContext = (): ChatContextValue => {
	const context = useContext(ChatContext);
	if (!context) {
		throw new Error("useChatContext must be used within ChatProvider");
	}
	return context;
};

interface ChatProviderProps {
	children: ReactNode;
}

/**
 * Provider component that sets up Effect services and manages state using effect-atom
 * ThreadService is the single source of truth; React state is automatically synced via atoms
 */
export const ChatProvider: FC<ChatProviderProps> = ({ children }) => {
	// Automatic reactive state - reads from ThreadService via atom
	const stateResult = useAtomValue(threadStateAtom);
	const refreshThreadState = useAtomRefresh(threadStateAtom);

	// Per-model loading state (local React state, not in ThreadService)
	const [loadingModels, setLoadingModels] = useState<string[]>([]);

	const state: ThreadState = Result.getOrElse(stateResult, () => ({
		id: crypto.randomUUID(),
		messages: [],
		isLoading: false,
		error: undefined,
		lastUpdated: Date.now(),
	})) as ThreadState;

	// Helper to send a message to ThreadService and invalidate atom to trigger refresh
	const sendToThreadService = useCallback(
		async (message: ThreadMessage) => {
			const program = Effect.gen(function* () {
				const threadService = yield* ThreadService;
				yield* threadService.send(message);
			});

			await sharedRuntime.runPromise(program);
			// Refresh atom to trigger re-render
			// The refresh triggers an async re-read of the atom
			refreshThreadState();
			// Wait for React to process the refresh
			// Use a small delay to ensure the atom has re-read the state
			await new Promise((resolve) => setTimeout(resolve, 50));
		},
		[refreshThreadState],
	);

	const addMessage = useCallback(
		async (role: "user" | "assistant" | "system", content: string) => {
			await sendToThreadService({
				type: "ADD_MESSAGE",
				payload: { role, content },
			});
		},
		[sendToThreadService],
	);

	const clearMessages = useCallback(async () => {
		await sendToThreadService({ type: "CLEAR_MESSAGES" });
	}, [sendToThreadService]);

	const retryLastMessage = useCallback(async () => {
		await sendToThreadService({ type: "RETRY_LAST_MESSAGE" });
	}, [sendToThreadService]);

	const sendMessage = useCallback(
		async (content: string, modelIds?: string[]) => {
			if (!content.trim()) return;

			// Determine if we're using multi-model mode
			const useMultiModel = modelIds && modelIds.length > 1;

			try {
				// Set loading state
				await sendToThreadService({ type: "SET_LOADING", payload: true });
				await sendToThreadService({ type: "SET_ERROR", payload: null });

				// Add user message
				await sendToThreadService({
					type: "ADD_MESSAGE",
					payload: { role: "user", content },
				});

				// Get current messages for streaming
				const getMessagesProgram = Effect.gen(function* () {
					const threadService = yield* ThreadService;
					return yield* threadService.getMessages();
				});

				const currentMessages =
					await sharedRuntime.runPromise(getMessagesProgram);

				// Validate that we have messages before streaming
				if (!currentMessages || currentMessages.length === 0) {
					console.error(
						"No messages found after adding user message. Messages:",
						currentMessages,
					);
					throw new Error(
						"No messages available to send. The user message may not have been saved properly.",
					);
				}

				if (useMultiModel && modelIds) {
					// Multi-model mode
					// Get model configs for selected models
					const getModelConfigsProgram = Effect.gen(function* () {
						const modelConfigService = yield* ModelConfigService;
						const availableModels =
							yield* modelConfigService.getAvailableModels();

						// Filter to selected models and create configs
						const configs = [];
						for (const modelId of modelIds) {
							const model = availableModels.find((m) => m.modelId === modelId);
							if (model) {
								const config = yield* modelConfigService.getModelConfig(
									model.modelId,
									model.provider,
								);
								configs.push({
									modelId: config.modelId,
									provider: config.provider,
								});
							}
						}
						return configs;
					});

					const modelConfigs = await sharedRuntime.runPromise(
						getModelConfigsProgram.pipe(
							Effect.provide(ModelConfigService.Default()),
						),
					);

					if (modelConfigs.length === 0) {
						throw new Error("No valid model configurations found");
					}

					// Initialize loading models state
					setLoadingModels(modelConfigs.map((c) => c.modelId));

					// Use MultiModelStreamingService
					const multiModelProgram = Effect.gen(function* () {
						const multiModelService = yield* MultiModelStreamingService;

						return yield* multiModelService.streamMultipleModels({
							messages: currentMessages,
							modelConfigs,
							onModelStart: (modelId) => {
								// Model started - ensure it's in loading list
								setLoadingModels((prev) => {
									if (!prev.includes(modelId)) {
										return [...prev, modelId];
									}
									return prev;
								});
							},
							onChunk: (modelId, chunk, accumulated) => {
								// Only update if we have accumulated content
								if (!accumulated || accumulated.length === 0) {
									return;
								}

								console.log(
									`onChunk for ${modelId}: chunk length=${chunk.length}, accumulated length=${accumulated.length}`,
								);

								// Update ThreadService for this specific model
								const updateProgram = Effect.gen(function* () {
									const threadService = yield* ThreadService;
									const threadState = yield* threadService.getState();

									// Find existing message for this model
									const existingMessageIndex = threadState.messages.findIndex(
										(m) =>
											m.role === "assistant" &&
											m.metadata &&
											typeof m.metadata === "object" &&
											(m.metadata as Record<string, unknown>).modelId ===
												modelId,
									);

									const modelConfig = modelConfigs.find(
										(c) => c.modelId === modelId,
									);
									const metadata = modelConfig
										? {
												modelId: modelConfig.modelId,
												modelProvider: modelConfig.provider,
											}
										: undefined;

									if (existingMessageIndex >= 0) {
										// Update existing message - use a more efficient approach
										const existingMessage =
											threadState.messages[existingMessageIndex]!;
										// Only update if content actually changed
										if (existingMessage.content !== accumulated) {
											const messagesBefore = threadState.messages.slice(
												0,
												existingMessageIndex,
											);
											const messagesAfter = threadState.messages.slice(
												existingMessageIndex + 1,
											);

											// Clear all and rebuild
											yield* threadService.send({ type: "CLEAR_MESSAGES" });
											for (const msg of messagesBefore) {
												yield* threadService.send({
													type: "ADD_MESSAGE",
													payload: {
														role: msg.role,
														content: msg.content,
														metadata: msg.metadata as
															| Record<string, unknown>
															| undefined,
													},
												});
											}
											// Add updated message
											yield* threadService.send({
												type: "ADD_MESSAGE",
												payload: {
													role: "assistant",
													content: accumulated,
													metadata: metadata as Record<string, unknown> | undefined,
												},
											});
											// Add remaining messages
											for (const msg of messagesAfter) {
												yield* threadService.send({
													type: "ADD_MESSAGE",
													payload: {
														role: msg.role,
														content: msg.content,
														metadata: msg.metadata as
															| Record<string, unknown>
															| undefined,
													},
												});
											}
										}
									} else {
										// Add new message for this model
										yield* threadService.send({
											type: "ADD_MESSAGE",
											payload: {
												role: "assistant",
												content: accumulated,
												metadata: metadata as Record<string, unknown> | undefined,
											},
										});
									}
								});

								sharedRuntime
									.runPromise(updateProgram)
									.then(() => {
										refreshThreadState();
									})
									.catch((err) => {
										console.error(
											"Failed to update state during multi-model streaming:",
											err,
										);
									});
							},
							onModelComplete: (result) => {
								console.log(
									`[${result.provider}] Model ${result.modelId} completed: ${result.success ? "success" : "failed"}`,
									result.content
										? `Content length: ${result.content.length}`
										: `Error: ${result.error || "No error message"}`,
								);
								console.log(
									`[${result.provider}] Model ${result.modelId} result:`,
									{
										success: result.success,
										error: result.error,
										contentLength: result.content?.length || 0,
										contentPreview: result.content?.substring(0, 100),
										durationMs: result.durationMs,
										chunkCount: result.chunkCount,
									},
								);

								// Always save a message for every model, even if it failed
								// Use error message as content if no content was generated
								const messageContent =
									result.content && result.content.trim().length > 0
										? result.content
										: result.error
											? result.error // Store error message directly (will be displayed in error box)
											: "No response generated";

								console.log(
									`[${result.provider}] Saving message for model ${result.modelId} with content length: ${messageContent.length}, success: ${result.success}, error: ${result.error || "none"}`,
								);

								const finalUpdateProgram = Effect.gen(function* () {
									const threadService = yield* ThreadService;
									const threadState = yield* threadService.getState();

									// Find existing message for this model
									const existingMessageIndex = threadState.messages.findIndex(
										(m) =>
											m.role === "assistant" &&
											m.metadata &&
											typeof m.metadata === "object" &&
											(m.metadata as Record<string, unknown>).modelId ===
												result.modelId,
									);

									const modelConfig = modelConfigs.find(
										(c) => c.modelId === result.modelId,
									);
									const metadata = modelConfig
										? {
												modelId: modelConfig.modelId,
												modelProvider: modelConfig.provider,
												metrics: result.metrics,
												...(result.error ? { error: result.error } : {}),
												success: result.success,
											}
										: undefined;

									console.log(
										`[${result.provider}] Found existing message at index ${existingMessageIndex} for model ${result.modelId}`,
									);
									console.log(`[${result.provider}] Metadata being stored:`, {
										modelId: metadata?.modelId,
										modelProvider: metadata?.modelProvider,
										hasError: !!metadata?.error,
										error: metadata?.error,
										success: metadata?.success,
										hasMetrics: !!metadata?.metrics,
									});

									if (existingMessageIndex >= 0) {
										// Update existing message with final content and metrics
										// Always update in onModelComplete to ensure metrics are added
										const existingMessage =
											threadState.messages[existingMessageIndex]!;
										console.log(
											`Existing message content length: ${existingMessage.content.length}, new content length: ${messageContent.length}`,
										);

										const messagesBefore = threadState.messages.slice(
											0,
											existingMessageIndex,
										);
										const messagesAfter = threadState.messages.slice(
											existingMessageIndex + 1,
										);

										console.log(
											`Updating message with metrics: ${messagesBefore.length} before, ${messagesAfter.length} after`,
										);

										yield* threadService.send({ type: "CLEAR_MESSAGES" });
										for (const msg of messagesBefore) {
											yield* threadService.send({
												type: "ADD_MESSAGE",
												payload: {
													role: msg.role,
													content: msg.content,
													metadata: msg.metadata as
														| Record<string, unknown>
														| undefined,
												},
											});
										}
										// Always update with metrics in onModelComplete
										yield* threadService.send({
											type: "ADD_MESSAGE",
											payload: {
												role: "assistant",
												content: messageContent,
												metadata: metadata as
													| Record<string, unknown>
													| undefined,
											},
										});
										for (const msg of messagesAfter) {
											yield* threadService.send({
												type: "ADD_MESSAGE",
												payload: {
													role: msg.role,
													content: msg.content,
													metadata: msg.metadata as
														| Record<string, unknown>
														| undefined,
												},
											});
										}
									} else {
										// Add new message if it doesn't exist
										console.log(`No existing message found, creating new one`);
										yield* threadService.send({
											type: "ADD_MESSAGE",
											payload: {
												role: "assistant",
												content: messageContent,
												metadata: metadata as
													| Record<string, unknown>
													| undefined,
											},
										});
									}
								});

								sharedRuntime
									.runPromise(finalUpdateProgram)
									.then(() => {
										console.log(
											`[${result.provider}] Final message saved for model ${result.modelId} with success=${result.success}, error=${result.error || "none"}`,
										);
										refreshThreadState();
									})
									.catch((err) => {
										console.error(
											`[${result.provider}] Failed to save final message for model ${result.modelId}:`,
											err,
										);
									});

								// Remove from loading list
								setLoadingModels((prev) =>
									prev.filter((id) => id !== result.modelId),
								);
							},
							onError: (modelId, error) => {
								console.error(`Error for model ${modelId}:`, error);
								// Remove from loading list on error
								setLoadingModels((prev) => prev.filter((id) => id !== modelId));
							},
						});
					});

					const results = await sharedRuntime.runPromise(
						multiModelProgram.pipe(
							Effect.provide(MultiModelStreamingService.Default()),
							Effect.catchAll((error: any) => {
								const errorMessage =
									error instanceof Error ? error.message : String(error);
								return Effect.fail(new Error(errorMessage));
							}),
						),
					);

					console.log(
						`Multi-model stream completed. ${results.length} models processed.`,
					);
				} else {
					// Single model mode (existing behavior)
					// Create assistant message placeholder before streaming starts
					await sendToThreadService({
						type: "ADD_MESSAGE",
						payload: { role: "assistant", content: "" },
					});

					// Get the message ID of the newly added assistant message
					const getLastMessageIdProgram = Effect.gen(function* () {
						const threadService = yield* ThreadService;
						const threadState = yield* threadService.getState();
						return threadState.messages[threadState.messages.length - 1]?.id;
					});

					const assistantMessageId = await sharedRuntime.runPromise(
						getLastMessageIdProgram,
					);

					// Use StreamingService to handle the streaming
					const streamProgram = Effect.gen(function* () {
						const streaming = yield* StreamingService;

						return yield* streaming.streamChat({
							messages: currentMessages,
							messageId: assistantMessageId,
							onChunk: (chunk, accumulated) => {
								// Update ThreadService during streaming for incremental updates
								const updateProgram = Effect.gen(function* () {
									const threadService = yield* ThreadService;
									const currentState = yield* threadService.getState();
									const lastMessage =
										currentState.messages[currentState.messages.length - 1];

									// Always update the last message if it's an assistant message
									if (lastMessage?.role === "assistant") {
										// Remove the last assistant message and add updated one
										yield* threadService.send({ type: "RETRY_LAST_MESSAGE" });
										yield* threadService.send({
											type: "ADD_MESSAGE",
											payload: { role: "assistant", content: accumulated },
										});
									} else {
										// Fallback: add new assistant message if last isn't assistant
										yield* threadService.send({
											type: "ADD_MESSAGE",
											payload: { role: "assistant", content: accumulated },
										});
									}
								});

								// Update ThreadService and refresh atom to trigger re-render
								sharedRuntime
									.runPromise(updateProgram)
									.then(() => {
										refreshThreadState();
									})
									.catch((err) => {
										console.error(
											"Failed to update state during streaming:",
											err,
										);
									});
							},
						});
					});

					const result = await sharedRuntime.runPromise(
						streamProgram.pipe(
							Effect.catchAll((error: any) => {
								const errorMessage =
									error instanceof Error ? error.message : String(error);
								if (errorMessage.includes("API key")) {
									return Effect.fail(
										new Error(
											"No API key configured. Please set VITE_OPENAI_API_KEY or VITE_ANTHROPIC_API_KEY in your .env.local file and restart the dev server.",
										),
									);
								}
								return Effect.fail(
									error instanceof Error ? error : new Error(errorMessage),
								);
							}),
						),
					);

					console.log(
						`Stream completed. Total chunks: ${result.chunkCount}, Duration: ${result.durationMs}ms`,
					);

					// Final sync to ThreadService
					const finalSyncProgram = Effect.gen(function* () {
						const threadService = yield* ThreadService;
						const threadState = yield* threadService.getState();
						const lastThreadMessage =
							threadState.messages[threadState.messages.length - 1];

						if (
							lastThreadMessage?.role === "assistant" &&
							lastThreadMessage.content !== result.content
						) {
							yield* threadService.send({ type: "RETRY_LAST_MESSAGE" });
							yield* threadService.send({
								type: "ADD_MESSAGE",
								payload: { role: "assistant", content: result.content },
							});
						}
					});

					await sharedRuntime.runPromise(finalSyncProgram);
				}

				// Refresh atom to ensure final state is reflected
				refreshThreadState();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error occurred";
				console.error("Error in sendMessage:", err);
				console.error(
					"Error stack:",
					err instanceof Error ? err.stack : "No stack trace",
				);

				// Ensure error is set in ThreadService (atom will auto-refresh)
				await sendToThreadService({ type: "SET_ERROR", payload: errorMessage });
			} finally {
				// Always clear loading state in ThreadService (atom will auto-refresh)
				await sendToThreadService({ type: "SET_LOADING", payload: false });
				// Clear per-model loading state
				setLoadingModels([]);
			}
		},
		[sendToThreadService, refreshThreadState],
	);

	const value: ChatContextValue = {
		state,
		messages: state.messages,
		isLoading: state.isLoading,
		loadingModels,
		error: state.error ?? null,
		addMessage,
		clearMessages,
		retryLastMessage,
		sendMessage,
	};

	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

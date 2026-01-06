import { Result, useAtomRefresh, useAtomValue } from "@effect-atom/atom-react";
import { Effect } from "effect";
import { FC, ReactNode, createContext, useCallback, useContext } from "react";
import type {
	Message,
	ThreadMessage,
	ThreadState,
} from "../actors/ThreadActor.js";
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
	error: string | null;

	// Thread actions
	addMessage: (
		role: "user" | "assistant" | "system",
		content: string,
	) => Promise<void>;
	clearMessages: () => Promise<void>;
	retryLastMessage: () => Promise<void>;

	// Chat runtime
	sendMessage: (content: string) => Promise<void>;
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

	const state: ThreadState = Result.getOrElse(stateResult, () => ({
		id: crypto.randomUUID(),
		messages: [],
		isLoading: false,
		error: undefined,
		lastUpdated: Date.now(),
	}));

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
		async (content: string) => {
			if (!content.trim()) return;

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

				// Create assistant message placeholder before streaming starts
				// This ensures we have a message to update during streaming
				await sendToThreadService({
					type: "ADD_MESSAGE",
					payload: { role: "assistant", content: "" },
				});

				// Use StreamingService to handle the streaming
				const streamProgram = Effect.gen(function* () {
					const streaming = yield* StreamingService;

					return yield* streaming.streamChat({
						messages: currentMessages,
						onChunk: (chunk, accumulated) => {
							// Update ThreadService during streaming for incremental updates
							// The atom will automatically refresh React components
							const updateProgram = Effect.gen(function* () {
								const threadService = yield* ThreadService;
								const currentState = yield* threadService.getState();
								const lastMessage =
									currentState.messages[currentState.messages.length - 1];

								// Always update the last message if it's an assistant message
								// Otherwise add a new one (shouldn't happen, but safety check)
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
						Effect.catchAll((error) => {
							// If ChatRuntime fails to initialize (no API key), provide a clearer error
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

				// Final sync to ThreadService - ensure the last message matches final content
				// The onChunk handler should have already updated it, but this ensures consistency
				const finalSyncProgram = Effect.gen(function* () {
					const threadService = yield* ThreadService;
					const threadState = yield* threadService.getState();
					const lastThreadMessage =
						threadState.messages[threadState.messages.length - 1];

					// Only update if the last message is different from the final result
					// This prevents creating duplicates if the streaming already completed correctly
					if (
						lastThreadMessage?.role === "assistant" &&
						lastThreadMessage.content !== result.content
					) {
						// Update the last assistant message to match final content
						yield* threadService.send({ type: "RETRY_LAST_MESSAGE" });
						yield* threadService.send({
							type: "ADD_MESSAGE",
							payload: { role: "assistant", content: result.content },
						});
					}
					// If last message is not assistant or content matches, no update needed
				});

				await sharedRuntime.runPromise(finalSyncProgram);
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
			}
		},
		[sendToThreadService, refreshThreadState],
	);

	const value: ChatContextValue = {
		state,
		messages: state.messages,
		isLoading: state.isLoading,
		error: state.error ?? null,
		addMessage,
		clearMessages,
		retryLastMessage,
		sendMessage,
	};

	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

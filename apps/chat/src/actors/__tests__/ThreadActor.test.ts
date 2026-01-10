import { describe, it, expect, beforeEach } from "vitest";
import { Effect } from "effect";
import {
	createThreadActorConfig,
	ThreadState,
	Message,
	ThreadMessage,
} from "../ThreadActor";
import {
	createTestMessage,
	createTestThreadState,
} from "../../__tests__/fixtures/test-data";

describe("ThreadActor", () => {
	let config: ReturnType<typeof createThreadActorConfig>;
	let initialState: ThreadState;

	beforeEach(() => {
		config = createThreadActorConfig();
		initialState = config.initialState;
	});

	describe("ADD_MESSAGE", () => {
		it("should add a user message to empty state", async () => {
			const message: ThreadMessage = {
				type: "ADD_MESSAGE",
				payload: { role: "user", content: "Hello" },
			};

			const newState = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(newState.messages).toHaveLength(1);
			expect(newState.messages[0]?.role).toBe("user");
			expect(newState.messages[0]?.content).toBe("Hello");
			expect(newState.lastUpdated).toBeGreaterThanOrEqual(
				initialState.lastUpdated,
			);
		});

		it("should add an assistant message", async () => {
			const message: ThreadMessage = {
				type: "ADD_MESSAGE",
				payload: { role: "assistant", content: "Hi there!" },
			};

			const newState = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(newState.messages).toHaveLength(1);
			expect(newState.messages[0]?.role).toBe("assistant");
			expect(newState.messages[0]?.content).toBe("Hi there!");
		});

		it("should add a system message", async () => {
			const message: ThreadMessage = {
				type: "ADD_MESSAGE",
				payload: { role: "system", content: "System prompt" },
			};

			const newState = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(newState.messages).toHaveLength(1);
			expect(newState.messages[0]?.role).toBe("system");
		});

		it("should append messages to existing state", async () => {
			const stateWithMessage = createTestThreadState({
				messages: [createTestMessage({ role: "user", content: "First" })],
			});

			const message: ThreadMessage = {
				type: "ADD_MESSAGE",
				payload: { role: "assistant", content: "Second" },
			};

			const newState = await Effect.runPromise(
				config.receive(stateWithMessage, message),
			);

			expect(newState.messages).toHaveLength(2);
			expect(newState.messages[0]?.content).toBe("First");
			expect(newState.messages[1]?.content).toBe("Second");
		});

		it("should generate unique IDs for messages", async () => {
			const message: ThreadMessage = {
				type: "ADD_MESSAGE",
				payload: { role: "user", content: "Test" },
			};

			const state1 = await Effect.runPromise(
				config.receive(initialState, message),
			);
			const state2 = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(state1.messages[0]?.id).not.toBe(state2.messages[0]?.id);
		});

		it("should update lastUpdated timestamp", async () => {
			const oldTimestamp = initialState.lastUpdated;
			await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay

			const message: ThreadMessage = {
				type: "ADD_MESSAGE",
				payload: { role: "user", content: "Test" },
			};

			const newState = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(newState.lastUpdated).toBeGreaterThan(oldTimestamp);
		});
	});

	describe("CLEAR_MESSAGES", () => {
		it("should clear all messages from state", async () => {
			const stateWithMessages = createTestThreadState({
				messages: [
					createTestMessage({ role: "user", content: "Message 1" }),
					createTestMessage({ role: "assistant", content: "Message 2" }),
				],
				error: "Some error",
			});

			const message: ThreadMessage = { type: "CLEAR_MESSAGES" };

			const newState = await Effect.runPromise(
				config.receive(stateWithMessages, message),
			);

			expect(newState.messages).toHaveLength(0);
			expect(newState.error).toBeUndefined();
			expect(newState.lastUpdated).toBeGreaterThanOrEqual(
				stateWithMessages.lastUpdated,
			);
		});

		it("should work on empty state", async () => {
			const message: ThreadMessage = { type: "CLEAR_MESSAGES" };

			const newState = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(newState.messages).toHaveLength(0);
		});
	});

	describe("SET_LOADING", () => {
		it("should set loading to true", async () => {
			const message: ThreadMessage = { type: "SET_LOADING", payload: true };

			const newState = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(newState.isLoading).toBe(true);
			expect(newState.lastUpdated).toBeGreaterThanOrEqual(
				initialState.lastUpdated,
			);
		});

		it("should set loading to false", async () => {
			const stateWithLoading = createTestThreadState({ isLoading: true });

			const message: ThreadMessage = { type: "SET_LOADING", payload: false };

			const newState = await Effect.runPromise(
				config.receive(stateWithLoading, message),
			);

			expect(newState.isLoading).toBe(false);
		});
	});

	describe("SET_ERROR", () => {
		it("should set error message", async () => {
			const message: ThreadMessage = {
				type: "SET_ERROR",
				payload: "Something went wrong",
			};

			const newState = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(newState.error).toBe("Something went wrong");
			expect(newState.lastUpdated).toBeGreaterThanOrEqual(
				initialState.lastUpdated,
			);
		});

		it("should clear error when set to null", async () => {
			const stateWithError = createTestThreadState({ error: "Previous error" });

			const message: ThreadMessage = { type: "SET_ERROR", payload: null };

			const newState = await Effect.runPromise(
				config.receive(stateWithError, message),
			);

			expect(newState.error).toBeUndefined();
		});
	});

	describe("RETRY_LAST_MESSAGE", () => {
		it("should remove messages after last user message", async () => {
			const stateWithMessages = createTestThreadState({
				messages: [
					createTestMessage({ role: "user", content: "Question 1" }),
					createTestMessage({ role: "assistant", content: "Answer 1" }),
					createTestMessage({ role: "user", content: "Question 2" }),
					createTestMessage({ role: "assistant", content: "Answer 2" }),
				],
				error: "Some error",
			});

			const message: ThreadMessage = { type: "RETRY_LAST_MESSAGE" };

			const newState = await Effect.runPromise(
				config.receive(stateWithMessages, message),
			);

			expect(newState.messages).toHaveLength(3); // Keeps up to last user message
			expect(newState.messages[0]?.content).toBe("Question 1");
			expect(newState.messages[1]?.content).toBe("Answer 1");
			expect(newState.messages[2]?.content).toBe("Question 2");
			expect(newState.error).toBeUndefined();
		});

		it("should do nothing if no user messages exist", async () => {
			const stateWithOnlyAssistant = createTestThreadState({
				messages: [createTestMessage({ role: "assistant", content: "Answer" })],
			});

			const message: ThreadMessage = { type: "RETRY_LAST_MESSAGE" };

			const newState = await Effect.runPromise(
				config.receive(stateWithOnlyAssistant, message),
			);

			expect(newState.messages).toHaveLength(1);
			expect(newState.messages[0]?.content).toBe("Answer");
		});

		it("should work on empty state", async () => {
			const message: ThreadMessage = { type: "RETRY_LAST_MESSAGE" };

			const newState = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(newState.messages).toHaveLength(0);
		});

		it("should keep only the last user message if it is the only message", async () => {
			const stateWithOneUserMessage = createTestThreadState({
				messages: [
					createTestMessage({ role: "user", content: "Only question" }),
				],
			});

			const message: ThreadMessage = { type: "RETRY_LAST_MESSAGE" };

			const newState = await Effect.runPromise(
				config.receive(stateWithOneUserMessage, message),
			);

			expect(newState.messages).toHaveLength(1);
			expect(newState.messages[0]?.content).toBe("Only question");
		});
	});

	describe("State Immutability", () => {
		it("should not mutate original state", async () => {
			const originalMessages = [
				createTestMessage({ role: "user", content: "Original" }),
			];
			const state = createTestThreadState({ messages: originalMessages });

			const message: ThreadMessage = {
				type: "ADD_MESSAGE",
				payload: { role: "assistant", content: "New" },
			};

			await Effect.runPromise(config.receive(state, message));

			// Original state should be unchanged
			expect(state.messages).toHaveLength(1);
			expect(state.messages[0]?.content).toBe("Original");
		});

		it("should create new message array", async () => {
			const state = createTestThreadState({
				messages: [createTestMessage({ role: "user", content: "Test" })],
			});

			const message: ThreadMessage = {
				type: "ADD_MESSAGE",
				payload: { role: "assistant", content: "Response" },
			};

			const newState = await Effect.runPromise(config.receive(state, message));

			expect(newState.messages).not.toBe(state.messages);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty content messages", async () => {
			const message: ThreadMessage = {
				type: "ADD_MESSAGE",
				payload: { role: "user", content: "" },
			};

			const newState = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(newState.messages[0]?.content).toBe("");
		});

		it("should handle very long content", async () => {
			const longContent = "a".repeat(10000);
			const message: ThreadMessage = {
				type: "ADD_MESSAGE",
				payload: { role: "user", content: longContent },
			};

			const newState = await Effect.runPromise(
				config.receive(initialState, message),
			);

			expect(newState.messages[0]?.content).toBe(longContent);
		});
	});
});

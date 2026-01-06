import { Message, ThreadState } from "../../actors/ThreadActor";

/**
 * Create a test Message instance
 */
export function createTestMessage(overrides?: Partial<Message>): Message {
	return {
		id: crypto.randomUUID(),
		role: "user",
		content: "Test message",
		timestamp: Date.now(),
		...overrides,
	};
}

/**
 * Create a test ThreadState instance
 */
export function createTestThreadState(
	overrides?: Partial<ThreadState>,
): ThreadState {
	return {
		id: crypto.randomUUID(),
		messages: [],
		isLoading: false,
		error: undefined,
		lastUpdated: Date.now(),
		...overrides,
	};
}

/**
 * Create multiple test messages
 */
export function createTestMessages(
	count: number,
	role: "user" | "assistant" | "system" = "user",
): Message[] {
	return Array.from({ length: count }, (_, i) =>
		createTestMessage({
			role,
			content: `Test message ${i + 1}`,
			timestamp: Date.now() + i,
		}),
	);
}

/**
 * Create a test AsyncIterable for streaming tests
 * Note: This is a test utility, not a mock - it creates real async iterables
 */
export async function* createTestStream(
	chunks: string[],
): AsyncIterable<string> {
	for (const chunk of chunks) {
		yield chunk;
	}
}

import type { Effect } from "effect";
import type { Message } from "../../actors/ThreadActor.js";

/**
 * PersistenceService API interface
 */
export interface PersistenceServiceApi {
	readonly saveThread: (
		threadId: string,
		messages: readonly Message[],
	) => Effect.Effect<void, never, unknown>;
	readonly loadThread: (
		threadId: string,
	) => Effect.Effect<Message[] | null, never, unknown>;
	readonly deleteThread: (
		threadId: string,
	) => Effect.Effect<void, never, unknown>;
	readonly listThreads: () => Effect.Effect<string[], never, unknown>;
}

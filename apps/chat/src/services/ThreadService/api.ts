import type { Effect } from "effect";
import type {
	Message,
	ThreadMessage,
	ThreadState,
} from "../../actors/ThreadActor.js";

/**
 * ThreadService API interface
 */
export interface ThreadServiceApi {
	readonly getState: () => Effect.Effect<ThreadState>;
	readonly send: (message: ThreadMessage) => Effect.Effect<void>;
	readonly getMessages: () => Effect.Effect<readonly Message[]>;
	readonly isLoading: () => Effect.Effect<boolean>;
}

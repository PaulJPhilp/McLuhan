import type { Effect } from "effect";
import type { Message } from "../../actors/ThreadActor.js";

/**
 * ChatRuntime API interface
 */
export interface ChatRuntimeApi {
	readonly generateResponse: (
		messages: readonly Message[],
	) => Effect.Effect<string, Error>;
	readonly streamResponse: (
		messages: readonly Message[],
	) => AsyncIterable<string>;
}

import type { Effect } from "effect";
import type {
	EmptyStreamError,
	InvalidMessagesError,
	StreamError,
	StreamTimeoutError,
} from "./errors.js";
import type { StreamChatOptions, StreamResult } from "./types.js";

/**
 * StreamingService API interface
 */
export interface StreamingServiceApi {
	/**
	 * Stream a chat response with callbacks for chunks
	 * Returns the final accumulated content
	 */
	readonly streamChat: (
		options: StreamChatOptions,
	) => Effect.Effect<
		StreamResult,
		StreamError | StreamTimeoutError | EmptyStreamError | InvalidMessagesError
	>;
}

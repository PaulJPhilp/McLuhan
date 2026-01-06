import { Data } from "effect";
import type { ThreadMessage } from "../../actors/ThreadActor.js";

/**
 * Error when an invalid thread message is sent
 */
export class InvalidThreadMessageError extends Data.TaggedError(
	"InvalidThreadMessageError",
)<{
	readonly message: string;
	readonly threadMessage: ThreadMessage;
}> {}

/**
 * Error when thread state is invalid
 */
export class InvalidThreadStateError extends Data.TaggedError(
	"InvalidThreadStateError",
)<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

/**
 * Error when a thread operation fails
 */
export class ThreadOperationError extends Data.TaggedError(
	"ThreadOperationError",
)<{
	readonly message: string;
	readonly operation: string;
	readonly cause?: unknown;
}> {}

import { Data } from "effect";

/**
 * Error when stream times out
 */
export class StreamTimeoutError extends Data.TaggedError("StreamTimeoutError")<{
	readonly message: string;
	readonly timeoutMs: number;
	readonly chunkCount: number;
}> {}

/**
 * Error when stream fails
 */
export class StreamError extends Data.TaggedError("StreamError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

/**
 * Error when no content is received from stream
 */
export class EmptyStreamError extends Data.TaggedError("EmptyStreamError")<{
	readonly message: string;
	readonly durationMs: number;
}> {}

/**
 * Error when messages are invalid for streaming
 */
export class InvalidMessagesError extends Data.TaggedError(
	"InvalidMessagesError",
)<{
	readonly message: string;
}> {}

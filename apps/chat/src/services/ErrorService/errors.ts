import { Data } from "effect";

/**
 * Error when error processing fails
 */
export class ErrorProcessingError extends Data.TaggedError(
	"ErrorProcessingError",
)<{
	readonly message: string;
	readonly originalError: unknown;
	readonly cause?: unknown;
}> {}

/**
 * Error when error categorization fails
 */
export class ErrorCategorizationError extends Data.TaggedError(
	"ErrorCategorizationError",
)<{
	readonly message: string;
	readonly originalError: unknown;
	readonly cause?: unknown;
}> {}

/**
 * Error when error formatting fails
 */
export class ErrorFormattingError extends Data.TaggedError(
	"ErrorFormattingError",
)<{
	readonly message: string;
	readonly originalError: unknown;
	readonly cause?: unknown;
}> {}

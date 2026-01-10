import type { Effect } from "effect";
import type { ErrorCategory, FormattedError } from "./types.js";

/**
 * ErrorService API interface
 */
export interface ErrorServiceApi {
	/**
	 * Format an error into a user-friendly structure
	 */
	readonly formatError: (error: unknown) => Effect.Effect<FormattedError>;

	/**
	 * Categorize an error by its type
	 */
	readonly categorizeError: (error: unknown) => Effect.Effect<ErrorCategory>;

	/**
	 * Check if an error is recoverable (user can retry)
	 */
	readonly isRecoverable: (error: unknown) => Effect.Effect<boolean>;

	/**
	 * Get a user-friendly message for an error
	 */
	readonly getUserMessage: (error: unknown) => Effect.Effect<string>;

	/**
	 * Get a suggestion for how to fix the error
	 */
	readonly getSuggestion: (error: unknown) => Effect.Effect<string | undefined>;
}

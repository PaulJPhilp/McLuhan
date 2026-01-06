/**
 * Error categories for classification
 */
export type ErrorCategory =
	| "api_key"
	| "network"
	| "timeout"
	| "validation"
	| "stream"
	| "unknown";

/**
 * Formatted error with user-friendly message and metadata
 */
export interface FormattedError {
	readonly message: string;
	readonly category: ErrorCategory;
	readonly isRecoverable: boolean;
	readonly suggestion?: string;
	readonly technicalDetails?: string;
}

/**
 * Error display options
 */
export interface ErrorDisplayOptions {
	readonly showSuggestion?: boolean;
	readonly showTechnicalDetails?: boolean;
}

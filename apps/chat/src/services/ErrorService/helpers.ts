import type { ErrorCategory, FormattedError } from "./types.js";

/**
 * API key related error patterns
 */
const API_KEY_PATTERNS = [
	"api key",
	"api_key",
	"apikey",
	"authentication",
	"unauthorized",
	"invalid key",
	"missing key",
	"no key",
	"bearer",
	"401",
];

/**
 * Network related error patterns
 */
const NETWORK_PATTERNS = [
	"network",
	"fetch",
	"connection",
	"econnrefused",
	"enotfound",
	"timeout",
	"cors",
	"failed to fetch",
	"net::",
];

/**
 * Timeout related error patterns
 */
const TIMEOUT_PATTERNS = ["timeout", "timed out", "deadline", "exceeded"];

/**
 * Stream related error patterns
 */
const STREAM_PATTERNS = [
	"stream",
	"streaming",
	"chunk",
	"readable",
	"empty stream",
];

/**
 * Check if error message matches any pattern
 */
function matchesPatterns(
	message: string,
	patterns: readonly string[],
): boolean {
	const lowerMessage = message.toLowerCase();
	return patterns.some((pattern) => lowerMessage.includes(pattern));
}

/**
 * Extract error message from unknown error
 */
export function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	if (error && typeof error === "object" && "message" in error) {
		return String((error as { message: unknown }).message);
	}
	return "An unknown error occurred";
}

/**
 * Categorize error based on message patterns
 */
export function categorizeErrorMessage(message: string): ErrorCategory {
	if (matchesPatterns(message, API_KEY_PATTERNS)) {
		return "api_key";
	}
	if (matchesPatterns(message, TIMEOUT_PATTERNS)) {
		return "timeout";
	}
	if (matchesPatterns(message, NETWORK_PATTERNS)) {
		return "network";
	}
	if (matchesPatterns(message, STREAM_PATTERNS)) {
		return "stream";
	}
	return "unknown";
}

/**
 * Check if error category is recoverable
 */
export function isCategoryRecoverable(category: ErrorCategory): boolean {
	switch (category) {
		case "network":
		case "timeout":
		case "stream":
			return true;
		case "api_key":
		case "validation":
		case "unknown":
			return false;
	}
}

/**
 * Get user-friendly message for category
 */
export function getCategoryMessage(
	category: ErrorCategory,
	originalMessage: string,
): string {
	switch (category) {
		case "api_key":
			return "API key configuration error. Please check your API key settings.";
		case "network":
			return "Network connection error. Please check your internet connection.";
		case "timeout":
			return "Request timed out. The server took too long to respond.";
		case "stream":
			return "Error while streaming response. Please try again.";
		case "validation":
			return "Invalid input. Please check your message and try again.";
		case "unknown":
			return originalMessage || "An unexpected error occurred.";
	}
}

/**
 * Get suggestion for category
 */
export function getCategorySuggestion(
	category: ErrorCategory,
): string | undefined {
	switch (category) {
		case "api_key":
			return "Create a .env.local file in apps/chat/ with VITE_OPENAI_API_KEY or VITE_ANTHROPIC_API_KEY and restart the dev server.";
		case "network":
			return "Check your internet connection and try again.";
		case "timeout":
			return "Try sending a shorter message or wait a moment and retry.";
		case "stream":
			return "Click retry or refresh the page.";
		case "validation":
			return "Check your input and try again.";
		case "unknown":
			return undefined;
	}
}

/**
 * Create a formatted error from components
 */
export function createFormattedError(
	error: unknown,
	category: ErrorCategory,
): FormattedError {
	const originalMessage = extractErrorMessage(error);
	const isRecoverable = isCategoryRecoverable(category);
	const message = getCategoryMessage(category, originalMessage);
	const suggestion = getCategorySuggestion(category);
	const technicalDetails =
		originalMessage !== message ? originalMessage : undefined;

	const result: FormattedError = {
		message,
		category,
		isRecoverable,
	};

	if (suggestion !== undefined) {
		(result as { suggestion: string }).suggestion = suggestion;
	}

	if (technicalDetails !== undefined) {
		(result as { technicalDetails: string }).technicalDetails =
			technicalDetails;
	}

	return result;
}

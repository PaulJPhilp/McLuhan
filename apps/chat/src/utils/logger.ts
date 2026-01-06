/**
 * Simple logging utility
 * Logs are gated behind DEV mode to reduce production noise
 * Can be replaced with structured logging service in the future
 */

const isDev = import.meta.env.DEV;

/**
 * Log debug information (only in development)
 */
export function logDebug(...args: unknown[]): void {
	if (isDev) {
		console.log(...args);
	}
}

/**
 * Log error information (always logged)
 */
export function logError(...args: unknown[]): void {
	console.error(...args);
}

/**
 * Log warning information (always logged)
 */
export function logWarn(...args: unknown[]): void {
	console.warn(...args);
}

/**
 * Log info information (only in development)
 */
export function logInfo(...args: unknown[]): void {
	if (isDev) {
		console.info(...args);
	}
}

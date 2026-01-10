/**
 * Check if localStorage is available and accessible
 * Returns false if storage access is not allowed (e.g., in iframe, private browsing)
 * This function never throws - it catches all errors internally
 */
export function isLocalStorageAvailable(): boolean {
	// Use a more defensive check that never throws
	if (typeof window === "undefined") {
		return false;
	}

	// Check if we're in a context where storage is allowed
	// This prevents errors in restricted contexts (iframes, service workers, etc.)
	try {
		// Check if localStorage exists
		if (!window.localStorage) {
			return false;
		}

		// Check if we can access localStorage without throwing
		// Use Object.prototype.hasOwnProperty to avoid triggering access errors
		if (!Object.prototype.hasOwnProperty.call(window, "localStorage")) {
			return false;
		}

		// Try a minimal read operation that won't throw if storage is blocked
		// Accessing length can throw in some restricted contexts
		try {
			// Use a test key that's unlikely to exist to avoid side effects
			const testKey = "__localStorage_test__";
			window.localStorage.getItem(testKey);
			// If we get here, storage is accessible
			return true;
		} catch {
			// Storage access is blocked
			return false;
		}
	} catch {
		// Any error means storage is not available
		return false;
	}
}

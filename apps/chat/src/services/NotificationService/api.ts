import type { Effect } from "effect";
import type {
	Notification,
	NotificationOptions,
	NotificationState,
} from "./types.js";

/**
 * NotificationService API interface
 */
export interface NotificationServiceApi {
	/**
	 * Show a notification
	 */
	readonly show: (options: NotificationOptions) => Effect.Effect<Notification>;

	/**
	 * Show a success notification
	 */
	readonly success: (
		message: string,
		title?: string,
	) => Effect.Effect<Notification>;

	/**
	 * Show an error notification
	 */
	readonly error: (
		message: string,
		title?: string,
	) => Effect.Effect<Notification>;

	/**
	 * Show a warning notification
	 */
	readonly warning: (
		message: string,
		title?: string,
	) => Effect.Effect<Notification>;

	/**
	 * Show an info notification
	 */
	readonly info: (
		message: string,
		title?: string,
	) => Effect.Effect<Notification>;

	/**
	 * Dismiss a notification by ID
	 */
	readonly dismiss: (id: string) => Effect.Effect<void>;

	/**
	 * Dismiss all notifications
	 */
	readonly dismissAll: () => Effect.Effect<void>;

	/**
	 * Get current notification state
	 */
	readonly getState: () => Effect.Effect<NotificationState>;

	/**
	 * Subscribe to notification changes (returns unsubscribe function)
	 */
	readonly subscribe: (
		callback: (state: NotificationState) => void,
	) => Effect.Effect<() => void>;
}

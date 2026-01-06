import type {
	Notification,
	NotificationOptions,
	NotificationPosition,
} from "./types.js";

/**
 * Default notification duration in milliseconds
 */
export const DEFAULT_DURATION = 5000;

/**
 * Default maximum number of notifications
 */
export const DEFAULT_MAX_NOTIFICATIONS = 5;

/**
 * Default notification position
 */
export const DEFAULT_POSITION: NotificationPosition = "top-right";

/**
 * Create a notification from options
 */
export function createNotification(options: NotificationOptions): Notification {
	const notification: Notification = {
		id: crypto.randomUUID(),
		type: options.type || "info",
		message: options.message,
		timestamp: Date.now(),
		duration: options.duration ?? DEFAULT_DURATION,
		dismissible: options.dismissible ?? true,
	};

	if (options.title !== undefined) {
		(notification as { title: string }).title = options.title;
	}

	return notification;
}

/**
 * Get icon for notification type (emoji)
 */
export function getNotificationIcon(type: Notification["type"]): string {
	switch (type) {
		case "success":
			return "✓";
		case "error":
			return "✕";
		case "warning":
			return "⚠";
		case "info":
			return "ℹ";
	}
}

/**
 * Get CSS classes for notification type (Tailwind)
 */
export function getNotificationClasses(type: Notification["type"]): string {
	switch (type) {
		case "success":
			return "bg-green-50 border-green-200 text-green-800";
		case "error":
			return "bg-red-50 border-red-200 text-red-800";
		case "warning":
			return "bg-yellow-50 border-yellow-200 text-yellow-800";
		case "info":
			return "bg-blue-50 border-blue-200 text-blue-800";
	}
}

/**
 * Get position CSS classes (Tailwind)
 */
export function getPositionClasses(position: NotificationPosition): string {
	switch (position) {
		case "top-right":
			return "top-4 right-4";
		case "top-left":
			return "top-4 left-4";
		case "top-center":
			return "top-4 left-1/2 -translate-x-1/2";
		case "bottom-right":
			return "bottom-4 right-4";
		case "bottom-left":
			return "bottom-4 left-4";
		case "bottom-center":
			return "bottom-4 left-1/2 -translate-x-1/2";
	}
}

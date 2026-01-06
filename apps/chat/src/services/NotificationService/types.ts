/**
 * Notification severity/type
 */
export type NotificationType = "success" | "error" | "warning" | "info";

/**
 * Notification position on screen
 */
export type NotificationPosition =
	| "top-right"
	| "top-left"
	| "top-center"
	| "bottom-right"
	| "bottom-left"
	| "bottom-center";

/**
 * A single notification
 */
export interface Notification {
	readonly id: string;
	readonly type: NotificationType;
	readonly title?: string;
	readonly message: string;
	readonly duration?: number;
	readonly dismissible?: boolean;
	readonly timestamp: number;
}

/**
 * Options for creating a notification
 */
export interface NotificationOptions {
	readonly type?: NotificationType;
	readonly title?: string;
	readonly message: string;
	readonly duration?: number;
	readonly dismissible?: boolean;
}

/**
 * Notification service configuration
 */
export interface NotificationConfig {
	readonly maxNotifications?: number;
	readonly defaultDuration?: number;
	readonly defaultPosition?: NotificationPosition;
}

/**
 * Notification state (for React integration)
 */
export interface NotificationState {
	readonly notifications: readonly Notification[];
	readonly position: NotificationPosition;
}

import { Effect } from "effect";
import type { NotificationServiceApi } from "./api.js";
import {
	createNotification,
	DEFAULT_MAX_NOTIFICATIONS,
	DEFAULT_POSITION,
} from "./helpers.js";
import type {
	Notification,
	NotificationConfig,
	NotificationPosition,
	NotificationState,
} from "./types.js";

/**
 * NotificationService - manages toast/notification display
 */
export class NotificationService extends Effect.Service<NotificationService>()(
	"chat/NotificationService",
	{
		effect: Effect.fn(function* (config?: NotificationConfig) {
			// Internal state
			let notifications: Notification[] = [];
			let position: NotificationPosition =
				config?.defaultPosition ?? DEFAULT_POSITION;
			const maxNotifications =
				config?.maxNotifications ?? DEFAULT_MAX_NOTIFICATIONS;
			const subscribers = new Set<(state: NotificationState) => void>();

			// Auto-dismiss timers
			const timers = new Map<string, ReturnType<typeof setTimeout>>();

			// Notify subscribers of state changes
			const notifySubscribers = () => {
				const state: NotificationState = {
					notifications: [...notifications],
					position,
				};
				for (const callback of subscribers) {
					callback(state);
				}
			};

			// Schedule auto-dismiss
			const scheduleAutoDismiss = (notification: Notification) => {
				if (notification.duration && notification.duration > 0) {
					const timer = setTimeout(() => {
						notifications = notifications.filter(
							(n) => n.id !== notification.id,
						);
						timers.delete(notification.id);
						notifySubscribers();
					}, notification.duration);
					timers.set(notification.id, timer);
				}
			};

			// Add notification with limit enforcement
			const addNotification = (notification: Notification) => {
				// Remove oldest if at limit
				while (notifications.length >= maxNotifications) {
					const oldest = notifications[0];
					if (oldest) {
						const timer = timers.get(oldest.id);
						if (timer) {
							clearTimeout(timer);
							timers.delete(oldest.id);
						}
						notifications = notifications.slice(1);
					}
				}

				notifications = [...notifications, notification];
				scheduleAutoDismiss(notification);
				notifySubscribers();
			};

			return {
				show: (options) =>
					Effect.sync(() => {
						const notification = createNotification(options);
						addNotification(notification);
						return notification;
					}),

				success: (message, title) =>
					Effect.sync(() => {
						const notification = createNotification(
							title !== undefined
								? { type: "success", message, title }
								: { type: "success", message },
						);
						addNotification(notification);
						return notification;
					}),

				error: (message, title) =>
					Effect.sync(() => {
						const notification = createNotification(
							title !== undefined
								? { type: "error", message, title }
								: { type: "error", message },
						);
						addNotification(notification);
						return notification;
					}),

				warning: (message, title) =>
					Effect.sync(() => {
						const notification = createNotification(
							title !== undefined
								? { type: "warning", message, title }
								: { type: "warning", message },
						);
						addNotification(notification);
						return notification;
					}),

				info: (message, title) =>
					Effect.sync(() => {
						const notification = createNotification(
							title !== undefined
								? { type: "info", message, title }
								: { type: "info", message },
						);
						addNotification(notification);
						return notification;
					}),

				dismiss: (id) =>
					Effect.sync(() => {
						const timer = timers.get(id);
						if (timer) {
							clearTimeout(timer);
							timers.delete(id);
						}
						notifications = notifications.filter((n) => n.id !== id);
						notifySubscribers();
					}),

				dismissAll: () =>
					Effect.sync(() => {
						for (const timer of timers.values()) {
							clearTimeout(timer);
						}
						timers.clear();
						notifications = [];
						notifySubscribers();
					}),

				getState: () =>
					Effect.sync(() => ({
						notifications: [...notifications],
						position,
					})),

				subscribe: (callback) =>
					Effect.sync(() => {
						subscribers.add(callback);
						// Immediately call with current state
						callback({
							notifications: [...notifications],
							position,
						});
						// Return unsubscribe function
						return () => {
							subscribers.delete(callback);
						};
					}),
			} satisfies NotificationServiceApi;
		}),
		dependencies: [],
	},
) {}

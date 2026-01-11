import { Effect, Schema } from "effect";
import type { Message } from "../../actors/ThreadActor.js";
import type { PersistenceServiceApi } from "./api.js";
import {
	InvalidStorageDataError,
	StorageReadError,
	StorageUnavailableError,
	StorageWriteError,
} from "./errors.js";
import { isLocalStorageAvailable } from "./helpers.js";
import { ThreadsStorageSchema } from "./types.js";

/**
 * PersistenceService - manages thread state persistence using native JSON with Effect error handling
 */
export class PersistenceService extends Effect.Service<PersistenceService>()(
	"chat/PersistenceService",
	{
		effect: Effect.fn(function* () {
			return {
				saveThread: (threadId: string, messages: readonly Message[]) =>
					Effect.gen(function* () {
						if (!isLocalStorageAvailable()) {
							yield* Effect.fail(
								new StorageUnavailableError({
									message: "localStorage is not available in this environment",
								}),
							);
							return;
						}
						try {
							const existingData =
								window.localStorage.getItem("chat_threads") || "{}";
							// Parse existing threads using native JSON.parse wrapped in Effect
							const raw = yield* Effect.try({
								try: () => JSON.parse(existingData),
								catch: (cause) =>
									new InvalidStorageDataError({
										message: "Failed to parse stored thread data",
										cause,
									}),
							});
							const entries = yield* Schema.decodeUnknown(ThreadsStorageSchema)(
								raw,
							).pipe(
								Effect.catchAll((cause) =>
									Effect.fail(
										new InvalidStorageDataError({
											message: "Failed to decode stored thread data",
											cause,
										}),
									),
								),
							);

							// Convert to Record<string, Message[]>
							const threads: Record<string, Message[]> = {};
							for (const entry of entries) {
								threads[entry.key] = [...entry.value];
							}

							// Update with new messages (create mutable copy from readonly array)
							threads[threadId] = [...messages];

							// Stringify using native JSON.stringify wrapped in Effect
							const encoded = yield* Schema.encode(ThreadsStorageSchema)(
								Object.entries(threads).map(([key, value]) => ({ key, value })),
							);
							const serialized = yield* Effect.try({
								try: () => JSON.stringify(encoded),
								catch: (cause) =>
									new InvalidStorageDataError({
										message: "Failed to stringify thread data",
										cause,
									}),
							});

							window.localStorage.setItem("chat_threads", serialized);
						} catch (cause) {
							// Storage operation failed
							yield* Effect.fail(
								new StorageWriteError({
									message: `Failed to write thread ${threadId} to storage`,
									cause,
								}),
							);
						}
					}).pipe(Effect.ignore),

				loadThread: (threadId: string) =>
					isLocalStorageAvailable()
						? Effect.gen(function* () {
								const data = yield* Effect.try({
									try: () =>
										window.localStorage.getItem("chat_threads") || "{}",
									catch: (cause) =>
										new StorageReadError({
											message: "Failed to read from localStorage",
											cause,
										}),
								});
								const raw = yield* Effect.try({
									try: () => JSON.parse(data),
									catch: (cause) =>
										new InvalidStorageDataError({
											message: "Failed to parse stored thread data",
											cause,
										}),
								});
								const entries = yield* Schema.decodeUnknown(
									ThreadsStorageSchema,
								)(raw).pipe(
									Effect.catchAll((cause) =>
										Effect.fail(
											new InvalidStorageDataError({
												message: "Failed to decode stored thread data",
												cause,
											}),
										),
									),
								);
								// Convert to Record<string, Message[]>
								const threads: Record<string, Message[]> = {};
								for (const entry of entries) {
									threads[entry.key] = [...entry.value];
								}
								return threads[threadId] || null;
							}).pipe(
								Effect.catchAll(() => Effect.succeed(null as Message[] | null)),
							)
						: Effect.fail(
								new StorageUnavailableError({
									message: "localStorage is not available in this environment",
								}),
							).pipe(
								Effect.catchAll(() => Effect.succeed(null as Message[] | null)),
							),

				deleteThread: (threadId: string) =>
					Effect.gen(function* () {
						if (!isLocalStorageAvailable()) {
							yield* Effect.fail(
								new StorageUnavailableError({
									message: "localStorage is not available in this environment",
								}),
							);
							return;
						}
						try {
							const existingData =
								window.localStorage.getItem("chat_threads") || "{}";
							const raw = yield* Effect.try({
								try: () => JSON.parse(existingData),
								catch: (cause) =>
									new InvalidStorageDataError({
										message: "Failed to parse stored thread data",
										cause,
									}),
							});
							const entries = yield* Schema.decodeUnknown(ThreadsStorageSchema)(
								raw,
							).pipe(
								Effect.catchAll((cause) =>
									Effect.fail(
										new InvalidStorageDataError({
											message: "Failed to decode stored thread data",
											cause,
										}),
									),
								),
							);

							// Convert to Record<string, Message[]>
							const threads: Record<string, Message[]> = {};
							for (const entry of entries) {
								threads[entry.key] = [...entry.value];
							}

							const updatedThreads = { ...threads };
							delete updatedThreads[threadId];

							// Convert back to array format
							const updatedEntries = Object.entries(updatedThreads).map(
								([key, value]) => ({
									key,
									value,
								}),
							);

							const encoded =
								yield* Schema.encode(ThreadsStorageSchema)(updatedEntries);
							const serialized = yield* Effect.try({
								try: () => JSON.stringify(encoded),
								catch: (cause) =>
									new InvalidStorageDataError({
										message: "Failed to stringify thread data",
										cause,
									}),
							});

							window.localStorage.setItem("chat_threads", serialized);
						} catch (cause) {
							// Storage operation failed
							yield* Effect.fail(
								new StorageWriteError({
									message: `Failed to delete thread ${threadId} from storage`,
									cause,
								}),
							);
						}
					}).pipe(Effect.ignore),

				listThreads: () =>
					isLocalStorageAvailable()
						? Effect.gen(function* () {
								const data = yield* Effect.try({
									try: () =>
										window.localStorage.getItem("chat_threads") || "{}",
									catch: (cause) =>
										new StorageReadError({
											message: "Failed to read from localStorage",
											cause,
										}),
								});
								const raw = yield* Effect.try({
									try: () => JSON.parse(data),
									catch: (cause) =>
										new InvalidStorageDataError({
											message: "Failed to parse stored thread data",
											cause,
										}),
								});
								const entries = yield* Schema.decodeUnknown(
									ThreadsStorageSchema,
								)(raw).pipe(
									Effect.catchAll((cause) =>
										Effect.fail(
											new InvalidStorageDataError({
												message: "Failed to decode stored thread data",
												cause,
											}),
										),
									),
								);
								// Convert to Record<string, Message[]> to get keys
								const threads: Record<string, Message[]> = {};
								for (const entry of entries) {
									threads[entry.key] = [...entry.value];
								}
								return Object.keys(threads);
							}).pipe(Effect.catchAll(() => Effect.succeed([])))
						: Effect.fail(
								new StorageUnavailableError({
									message: "localStorage is not available in this environment",
								}),
							).pipe(Effect.catchAll(() => Effect.succeed([]))),
			} satisfies PersistenceServiceApi;
		}),
	},
) {}

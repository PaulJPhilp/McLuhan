import { Effect, Schema } from "effect";
import { jsonBackend } from "effect-json";
import { Message } from "../actors/ThreadActor";

// Schema for the threads storage structure
// Store as an array of { key, value } objects for compatibility with effect-json
const ThreadEntrySchema = Schema.Struct({
  key: Schema.String,
  value: Schema.Array(Message),
});
const ThreadsStorageSchema = Schema.Array(ThreadEntrySchema);

/**
 * Check if localStorage is available and accessible
 * Returns false if storage access is not allowed (e.g., in iframe, private browsing)
 * This function never throws - it catches all errors internally
 */
function isLocalStorageAvailable(): boolean {
  // Use a more defensive check that never throws
  if (typeof window === "undefined") {
    return false;
  }

  try {
    // Check if localStorage exists
    if (!window.localStorage) {
      return false;
    }

    // Try to access a property to see if it's accessible
    // Don't try to write/read as that might throw
    const test = window.localStorage.length;
    return typeof test === "number";
  } catch {
    // Any error means storage is not available
    return false;
  }
}

/**
 * PersistenceService - manages thread state persistence using effect-json
 */
export class PersistenceService extends Effect.Service<PersistenceService>()(
  "chat/PersistenceService",
  {
    effect: Effect.fn(function* () {
      return {
        saveThread: (threadId: string, messages: readonly Message[]) =>
          Effect.gen(function* () {
            if (!isLocalStorageAvailable()) {
              return;
            }
            try {
              const existingData =
                window.localStorage.getItem("chat_threads") || "{}";
              // Parse existing threads using effect-json backend directly
              const raw = yield* jsonBackend.parse(existingData);
              const entries = yield* Schema.decodeUnknown(ThreadsStorageSchema)(
                raw
              ).pipe(
                Effect.catchAll(() =>
                  Effect.succeed([] as Array<{ key: string; value: Message[] }>)
                )
              );

              // Convert to Record<string, Message[]>
              const threads: Record<string, Message[]> = {};
              for (const entry of entries) {
                threads[entry.key] = [...entry.value];
              }

              // Update with new messages (create mutable copy from readonly array)
              threads[threadId] = [...messages];

              // Stringify using effect-json backend directly
              const encoded = yield* Schema.encode(ThreadsStorageSchema)(
                Object.entries(threads).map(([key, value]) => ({ key, value }))
              );
              const serialized = yield* jsonBackend.stringify(encoded);

              window.localStorage.setItem("chat_threads", serialized);
            } catch {
              // Storage operation failed - ignore silently
              return;
            }
          }).pipe(Effect.ignore),

        loadThread: (threadId: string) =>
          isLocalStorageAvailable()
            ? Effect.gen(function* () {
                const data = yield* Effect.try({
                  try: () =>
                    window.localStorage.getItem("chat_threads") || "{}",
                  catch: () => new Error("Failed to read from localStorage"),
                });
                const raw = yield* jsonBackend.parse(data);
                const entries = yield* Schema.decodeUnknown(
                  ThreadsStorageSchema
                )(raw).pipe(
                  Effect.catchAll(() =>
                    Effect.succeed(
                      [] as Array<{ key: string; value: Message[] }>
                    )
                  )
                );
                // Convert to Record<string, Message[]>
                const threads: Record<string, Message[]> = {};
                for (const entry of entries) {
                  threads[entry.key] = [...entry.value];
                }
                return threads[threadId] || null;
              }).pipe(Effect.catchAll(() => Effect.succeed(null)))
            : Effect.succeed(null as Message[] | null),

        deleteThread: (threadId: string) =>
          Effect.gen(function* () {
            if (!isLocalStorageAvailable()) {
              return;
            }
            try {
              const existingData =
                window.localStorage.getItem("chat_threads") || "{}";
              const raw = yield* jsonBackend.parse(existingData);
              const entries = yield* Schema.decodeUnknown(ThreadsStorageSchema)(
                raw
              ).pipe(
                Effect.catchAll(() =>
                  Effect.succeed([] as Array<{ key: string; value: Message[] }>)
                )
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
                })
              );

              const encoded = yield* Schema.encode(ThreadsStorageSchema)(
                updatedEntries
              );
              const serialized = yield* jsonBackend.stringify(encoded);

              window.localStorage.setItem("chat_threads", serialized);
            } catch {
              // Storage operation failed - ignore silently
              return;
            }
          }).pipe(Effect.ignore),

        listThreads: () =>
          isLocalStorageAvailable()
            ? Effect.gen(function* () {
                const data = yield* Effect.try({
                  try: () =>
                    window.localStorage.getItem("chat_threads") || "{}",
                  catch: () => new Error("Failed to read from localStorage"),
                });
                const raw = yield* jsonBackend.parse(data);
                const entries = yield* Schema.decodeUnknown(
                  ThreadsStorageSchema
                )(raw).pipe(
                  Effect.catchAll(() =>
                    Effect.succeed(
                      [] as Array<{ key: string; value: Message[] }>
                    )
                  )
                );
                // Convert to Record<string, Message[]> to get keys
                const threads: Record<string, Message[]> = {};
                for (const entry of entries) {
                  threads[entry.key] = [...entry.value];
                }
                return Object.keys(threads);
              }).pipe(Effect.catchAll(() => Effect.succeed([])))
            : Effect.succeed([]),
      };
    }),
    dependencies: [],
  }
) {}

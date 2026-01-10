import { Schema } from "effect";
import { Message } from "../../actors/ThreadActor.js";

/**
 * Schema for a single thread entry in storage
 */
export const ThreadEntrySchema = Schema.Struct({
	key: Schema.String,
	value: Schema.Array(Message),
});

/**
 * Schema for the threads storage structure
 * Store as an array of { key, value } objects for JSON serialization
 */
export const ThreadsStorageSchema = Schema.Array(ThreadEntrySchema);

/**
 * Type for a thread entry
 */
export type ThreadEntry = Schema.Schema.Type<typeof ThreadEntrySchema>;

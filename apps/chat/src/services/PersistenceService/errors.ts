import { Data } from "effect";

/**
 * Error when storage is not available (e.g., localStorage disabled, private browsing)
 */
export class StorageUnavailableError extends Data.TaggedError(
	"StorageUnavailableError",
)<{
	readonly message: string;
}> {}

/**
 * Error when reading from storage fails
 */
export class StorageReadError extends Data.TaggedError("StorageReadError")<{
	readonly message: string;
	readonly cause?: unknown | undefined;
}> {}

/**
 * Error when writing to storage fails
 */
export class StorageWriteError extends Data.TaggedError("StorageWriteError")<{
	readonly message: string;
	readonly cause?: unknown | undefined;
}> {}

/**
 * Error when stored data format is invalid
 */
export class InvalidStorageDataError extends Data.TaggedError(
	"InvalidStorageDataError",
)<{
	readonly message: string;
	readonly cause?: unknown | undefined;
}> {}

/**
 * Error when a thread is not found
 */
export class ThreadNotFoundError extends Data.TaggedError(
	"ThreadNotFoundError",
)<{
	readonly threadId: string;
	readonly message: string;
}> {}

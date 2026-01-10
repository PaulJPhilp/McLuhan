import { Data } from "effect";

/**
 * Error when multi-model streaming fails
 */
export class MultiModelStreamError extends Data.TaggedError(
	"MultiModelStreamError",
)<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

/**
 * Error when a specific model fails during streaming
 */
export class ModelStreamError extends Data.TaggedError("ModelStreamError")<{
	readonly modelId: string;
	readonly provider: string;
	readonly message: string;
	readonly cause?: unknown;
}> {}

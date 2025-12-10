import { Data } from "effect";

/**
 * Base actor error
 */
export class ActorError extends Data.TaggedError("ActorError")<{
	readonly code: string;
	readonly context?: Record<string, unknown>;
}> {}

/**
 * Guard evaluation failed - transition blocked
 */
export class GuardFailedError extends Data.TaggedError("GuardFailedError")<{
	readonly guard: string;
	readonly reason: string;
}> {}

/**
 * Transition not allowed from current state
 */
export class TransitionNotAllowedError extends Data.TaggedError(
	"TransitionNotAllowedError",
)<{
	readonly from: string;
	readonly event: string;
	readonly available: string[];
}> {}

/**
 * Schema validation failed
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
	readonly reason: string;
	readonly path?: string;
	readonly expected?: unknown;
	readonly actual?: unknown;
	readonly cause?: Error;
}> {}

/**
 * Storage operation failed
 */
export class StorageError extends Data.TaggedError("StorageError")<{
	readonly backend: string;
	readonly operation: "save" | "load" | "query" | "getHistory";
	readonly reason?: string;
	readonly cause?: Error;
}> {}

/**
 * Actor spec definition is invalid
 */
export class SpecError extends Data.TaggedError("SpecError")<{
	readonly reason: string;
}> {}

/**
 * Actor spec not found in registry
 */
export class SpecNotFoundError extends Data.TaggedError("SpecNotFoundError")<{
	readonly actorType: string;
	readonly availableSpecs?: string[];
}> {}

/**
 * Invalid state reference
 */
export class InvalidStateError extends Data.TaggedError("InvalidStateError")<{
	readonly state: string;
	readonly validStates?: string[];
}> {}

/**
 * Guard not found in spec
 */
export class GuardNotFoundError extends Data.TaggedError("GuardNotFoundError")<{
	readonly guard: string;
}> {}

/**
 * Action not found in spec
 */
export class ActionNotFoundError extends Data.TaggedError(
	"ActionNotFoundError",
)<{
	readonly action: string;
}> {}

/**
 * Policy authorization failed
 */
export class PolicyError extends Data.TaggedError("PolicyError")<{
	readonly reason: string;
	readonly actor?: string;
	readonly actorType?: string;
	readonly event?: string;
}> {}

import { Data } from "effect";

/**
 * Error when a voice session is not found
 */
export class SessionNotFoundError extends Data.TaggedError(
	"SessionNotFoundError",
)<{
	readonly sessionId: string;
	readonly message: string;
}> {}

/**
 * Error when starting a voice session fails
 */
export class SessionStartError extends Data.TaggedError("SessionStartError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

/**
 * Error when ending a voice session fails
 */
export class SessionEndError extends Data.TaggedError("SessionEndError")<{
	readonly sessionId: string;
	readonly message: string;
	readonly cause?: unknown;
}> {}

/**
 * Error when getting voice state fails
 */
export class VoiceStateError extends Data.TaggedError("VoiceStateError")<{
	readonly sessionId: string;
	readonly message: string;
	readonly cause?: unknown;
}> {}

/**
 * Error when getting detected emotions fails
 */
export class EmotionDetectionError extends Data.TaggedError(
	"EmotionDetectionError",
)<{
	readonly sessionId: string;
	readonly message: string;
	readonly cause?: unknown;
}> {}

import { Data } from "effect";

/**
 * Error when no API key is configured
 */
export class MissingApiKeyError extends Data.TaggedError("MissingApiKeyError")<{
	readonly message: string;
}> {
	static readonly default = new MissingApiKeyError({
		message:
			"No API key found. Please set VITE_OPENAI_API_KEY or VITE_ANTHROPIC_API_KEY in your .env.local file",
	});
}

/**
 * General configuration error
 */
export class ConfigError extends Data.TaggedError("ConfigError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

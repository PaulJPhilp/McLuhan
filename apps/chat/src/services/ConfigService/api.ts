import type { Effect } from "effect";
import type { ConfigError, MissingApiKeyError } from "./errors.js";
import type { AIProviderConfig, ChatEnvValues } from "./types.js";

/**
 * ConfigService API interface
 */
export interface ConfigServiceApi {
	/**
	 * Get raw environment values
	 */
	readonly getEnvValues: () => Effect.Effect<ChatEnvValues>;

	/**
	 * Check if any API key is configured
	 */
	readonly hasApiKey: () => Effect.Effect<boolean>;

	/**
	 * Get the configured AI provider settings
	 * Fails with MissingApiKeyError if no API key is found
	 */
	readonly getProviderConfig: () => Effect.Effect<
		AIProviderConfig,
		MissingApiKeyError | ConfigError
	>;

	/**
	 * Get a specific environment value by key
	 */
	readonly getEnvValue: <K extends keyof ChatEnvValues>(
		key: K,
	) => Effect.Effect<ChatEnvValues[K]>;
}

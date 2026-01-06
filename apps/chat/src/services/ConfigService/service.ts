import { Effect } from "effect";
import type { ConfigServiceApi } from "./api.js";
import { ConfigError, MissingApiKeyError } from "./errors.js";
import { getDefaultModel, getViteEnvValues } from "./helpers.js";
import type { AIProvider, AIProviderConfig, ChatEnvValues } from "./types.js";

/**
 * ConfigService - centralized configuration and environment variable management
 */
export class ConfigService extends Effect.Service<ConfigService>()(
	"chat/ConfigService",
	{
		effect: Effect.fn(function* () {
			return {
				getEnvValues: () => Effect.sync(() => getViteEnvValues()),

				hasApiKey: () =>
					Effect.sync(() => {
						const env = getViteEnvValues();
						return !!(env.VITE_OPENAI_API_KEY || env.VITE_ANTHROPIC_API_KEY);
					}),

				getProviderConfig: () =>
					Effect.gen(function* () {
						const env = getViteEnvValues();
						const openaiKey = env.VITE_OPENAI_API_KEY;
						const anthropicKey = env.VITE_ANTHROPIC_API_KEY;
						const providerEnv = env.VITE_AI_PROVIDER;
						const modelEnv = env.VITE_AI_MODEL;
						const systemPrompt = env.VITE_SYSTEM_PROMPT;

						// Determine provider
						let provider: AIProvider;
						if (providerEnv === "anthropic" && anthropicKey) {
							provider = "anthropic";
						} else if (providerEnv === "openai" && openaiKey) {
							provider = "openai";
						} else if (openaiKey) {
							provider = "openai";
						} else if (anthropicKey) {
							provider = "anthropic";
						} else {
							return yield* Effect.fail(MissingApiKeyError.default);
						}

						// Get API key for selected provider
						const apiKey = provider === "openai" ? openaiKey : anthropicKey;
						if (!apiKey) {
							return yield* Effect.fail(
								new ConfigError({
									message: `API key not found for provider: ${provider}`,
								}),
							);
						}

						// Determine model
						const model = modelEnv || getDefaultModel(provider);

						const config: AIProviderConfig = {
							provider,
							apiKey,
							model,
							...(systemPrompt ? { systemPrompt } : {}),
						};

						return config;
					}),

				getEnvValue: <K extends keyof ChatEnvValues>(key: K) =>
					Effect.sync(() => {
						const env = getViteEnvValues();
						return env[key];
					}),
			} satisfies ConfigServiceApi;
		}),
	},
) {}

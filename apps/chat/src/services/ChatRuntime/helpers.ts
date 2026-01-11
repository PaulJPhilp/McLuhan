import type { LanguageModel } from "ai";
import { Chunk, Effect } from "effect";
import {
	Message as EffectiveMessage,
	TextPart,
	createProvider,
	getLanguageModel,
} from "effect-ai-sdk";
import type { Message } from "../../actors/ThreadActor.js";
import { logDebug } from "../../utils/logger.js";
import {
	getViteEnvValues,
	maskApiKey,
	type AIProviderConfig,
} from "../ConfigService/index.js";

/**
 * Helper to safely extract model identifier from LanguageModel
 */
function getModelId(model: LanguageModel): string {
	if (typeof model === "object" && model !== null) {
		if ("modelId" in model && typeof model.modelId === "string") {
			return model.modelId;
		}
		if ("model" in model && typeof model.model === "string") {
			return model.model;
		}
		if ("id" in model && typeof model.id === "string") {
			return model.id;
		}
	}
	return "unknown";
}

/**
 * Convert ThreadActor Message to EffectiveMessage
 */
export function toEffectiveMessage(message: Message): EffectiveMessage {
	const role = message.role === "assistant" ? "model" : message.role;
	const parts = Chunk.of(
		new TextPart({ _tag: "Text", content: message.content }),
	);
	return new EffectiveMessage({ role, parts });
}

/**
 * Convert ThreadActor Message[] to EffectiveMessage Chunk
 */
export function toEffectiveMessages(
	messages: readonly Message[],
): Chunk.Chunk<EffectiveMessage> {
	return Chunk.fromIterable(messages.map(toEffectiveMessage));
}

/**
 * Get provider and model from ConfigService, then create LanguageModel
 * Uses ConfigService for configuration and effect-ai-sdk for provider creation
 */
export function getProviderConfig(): Effect.Effect<
	{ provider: LanguageModel; modelName: string },
	Error
> {
	return Effect.gen(function* () {
		// Use ConfigService to get provider config
		// Note: We access ConfigService via getViteEnvValues for now to avoid layer dependencies
		// This keeps ChatRuntime independent of ConfigService layer
		const config = yield* Effect.try({
			try: () => {
				const env = getViteEnvValues();
				const openaiKey = env.VITE_OPENAI_API_KEY;
				const anthropicKey = env.VITE_ANTHROPIC_API_KEY;
				const providerEnv = env.VITE_AI_PROVIDER;
				const modelEnv = env.VITE_AI_MODEL;
				const systemPrompt = env.VITE_SYSTEM_PROMPT;

				// Determine provider
				let provider: "openai" | "anthropic";
				if (providerEnv === "anthropic" && anthropicKey) {
					provider = "anthropic";
				} else if (providerEnv === "openai" && openaiKey) {
					provider = "openai";
				} else if (openaiKey) {
					provider = "openai";
				} else if (anthropicKey) {
					provider = "anthropic";
				} else {
					throw new Error(
						"No API key found. Please set VITE_OPENAI_API_KEY or VITE_ANTHROPIC_API_KEY in your .env.local file",
					);
				}

				const apiKey = provider === "openai" ? openaiKey : anthropicKey;
				if (!apiKey) {
					throw new Error(`API key not found for provider: ${provider}`);
				}

				const model =
					modelEnv ||
					(provider === "openai" ? "gpt-4o" : "claude-3-5-sonnet-20241022");

				return { provider, apiKey, model, systemPrompt } as AIProviderConfig;
			},
			catch: (error) =>
				new Error(error instanceof Error ? error.message : String(error)),
		});

		// Log configuration (masked for security)
		logDebug("=== PROVIDER CONFIGURATION ===");
		logDebug("Provider:", config.provider);
		logDebug("API Key (masked):", maskApiKey(config.apiKey));
		logDebug("API Key length:", config.apiKey.length);
		logDebug("API Key starts with 'sk-':", config.apiKey.startsWith("sk-"));

		// Create provider instance using effect-ai-sdk's createProvider
		const provider = yield* createProvider(config.provider, {
			apiKey: config.apiKey,
		});
		logDebug("✓ Provider created:", typeof provider);

		// Get language model using effect-ai-sdk's getLanguageModel
		const model = yield* getLanguageModel(provider, config.model);

		// Log model configuration for debugging
		logDebug("Model obtained:", {
			modelId: getModelId(model),
			providerType: config.provider,
			modelName: config.model,
			hasProvider: !!provider,
		});

		return { provider: model, modelName: config.model };
	}).pipe(
		Effect.catchAll((error) =>
			Effect.fail(
				new Error(
					`Failed to initialize provider: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			),
		),
	);
}

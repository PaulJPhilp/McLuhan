import { Effect } from "effect";
import { PROVIDER_MODELS } from "effect-ai-sdk";
import type { SupportedProvider } from "effect-ai-sdk";
import { getViteEnvValues } from "../ConfigService/index.js";
import type { ModelConfigServiceApi } from "./api.js";
import { getModelColor } from "./colors.js";
import type { ModelConfig, ModelInfo } from "./types.js";

/**
 * Get display name for a model
 */
function getDisplayName(modelId: string, provider: string): string {
	// Clean up model IDs for display
	const cleanId = modelId
		.replace(/-20241022$/, "")
		.replace(/-20240229$/, "")
		.replace(/-20240307$/, "")
		.replace(/-32768$/, "")
		.replace(/-4096$/, "")
		.replace(/^gpt-/, "GPT-")
		.replace(/^claude-/, "Claude ")
		.replace(/^gemini-/, "Gemini ")
		.replace(/^mixtral-/, "Mixtral ")
		.replace(/^llama2-/, "Llama 2 ")
		.replace(/^gemma-/, "Gemma ")
		.replace(/^deepseek-/, "DeepSeek ")
		.replace(/^pplx-/, "Perplexity ")
		.replace(/^grok-/, "Grok ")
		.replace(/^qwen-/, "Qwen ");

	// Capitalize first letter
	return cleanId.charAt(0).toUpperCase() + cleanId.slice(1);
}

/**
 * Check if API key exists for a provider
 * Accesses import.meta.env directly to check for all provider API keys
 */
function hasApiKeyForProvider(provider: SupportedProvider): boolean {
	// Access import.meta.env directly to check for all possible API keys
	if (typeof import.meta === "undefined" || !import.meta.env) {
		return false;
	}

	const env = import.meta.env as Record<string, string | undefined>;

	switch (provider) {
		case "openai":
			return !!env.VITE_OPENAI_API_KEY;
		case "anthropic":
			return !!env.VITE_ANTHROPIC_API_KEY;
		case "google":
			return !!env.VITE_GOOGLE_API_KEY;
		case "groq":
			return !!env.VITE_GROQ_API_KEY;
		case "deepseek":
			return !!env.VITE_DEEPSEEK_API_KEY;
		case "perplexity":
			return !!env.VITE_PERPLEXITY_API_KEY;
		case "xai":
			return !!env.VITE_XAI_API_KEY;
		case "qwen":
			return !!env.VITE_QWEN_API_KEY;
		case "gateway":
			return !!env.VITE_VERCEL_AI_GATEWAY_API_KEY;
		default:
			return false;
	}
}

/**
 * ModelConfigService - manages model configurations and color assignments
 */
export class ModelConfigService extends Effect.Service<ModelConfigService>()(
	"chat/ModelConfigService",
	{
		effect: Effect.fn(function* () {
			return {
				getAvailableModels: () =>
					Effect.sync(() => {
						const models: ModelInfo[] = [];

						// Iterate through all providers and their models
						for (const [provider, modelIds] of Object.entries(
							PROVIDER_MODELS,
						) as [SupportedProvider, readonly string[]][]) {
							const hasApiKey = hasApiKeyForProvider(provider);

							for (const modelId of modelIds) {
								models.push({
									modelId,
									provider,
									displayName: getDisplayName(modelId, provider),
									hasApiKey,
								});
							}
						}

						return models;
					}),

				getModelConfig: (modelId: string, provider: string) =>
					Effect.sync(() => {
						const color = getModelColor(modelId);
						const displayName = getDisplayName(modelId, provider);

						return {
							modelId,
							provider,
							displayName,
							color,
						} satisfies ModelConfig;
					}),

				getModelColor: (modelId: string) =>
					Effect.sync(() => getModelColor(modelId)),

				getModelDisplayName: (modelId: string, provider: string) =>
					Effect.sync(() => getDisplayName(modelId, provider)),
			} satisfies ModelConfigServiceApi;
		}),
	},
) {}

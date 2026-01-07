/**
 * ModelConfigService API interface
 */

import type { Effect } from "effect";
import type { ModelConfig, ModelInfo } from "./types.js";

/**
 * Service API for model configuration and color management
 */
export interface ModelConfigServiceApi {
	/**
	 * Get all available models with their configurations
	 */
	readonly getAvailableModels: () => Effect.Effect<
		readonly ModelInfo[],
		never
	>;

	/**
	 * Get configuration for a specific model
	 */
	readonly getModelConfig: (
		modelId: string,
		provider: string,
	) => Effect.Effect<ModelConfig, never>;

	/**
	 * Get color for a model
	 */
	readonly getModelColor: (
		modelId: string,
	) => Effect.Effect<ModelConfig["color"], never>;

	/**
	 * Get display name for a model
	 */
	readonly getModelDisplayName: (
		modelId: string,
		provider: string,
	) => Effect.Effect<string, never>;
}

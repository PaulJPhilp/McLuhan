/**
 * MultiModelStreamingService API interface
 */

import type { Effect } from "effect";
import type {
	ModelStreamResult,
	MultiModelStreamOptions,
} from "./types.js";

/**
 * Service API for multi-model streaming
 */
export interface MultiModelStreamingServiceApi {
	/**
	 * Stream responses from multiple models sequentially
	 */
	readonly streamMultipleModels: (
		options: MultiModelStreamOptions,
	) => Effect.Effect<readonly ModelStreamResult[], never>;
}

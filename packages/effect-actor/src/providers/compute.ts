import { Effect } from "effect";

/**
 * ComputeProvider service - provides deterministic external computations
 *
 * Uses Effect's Clock for testability
 */
export class ComputeProvider extends Effect.Service<ComputeProvider>()(
	"effect-actor/ComputeProvider",
	{
		effect: Effect.succeed({
			/**
			 * Get current timestamp
			 */
			now: () => Effect.sync(() => new Date()),

			/**
			 * Generate a UUID
			 */
			uuid: () => Effect.sync(() => crypto.randomUUID()),

			/**
			 * Estimate reading time for text
			 * @param text - The text to analyze
			 * @returns Estimated reading time in minutes (200 words/min)
			 */
			estimateReadingTime: (text: string) =>
				Effect.sync(() => Math.ceil(text.split(/\s+/).length / 200)),
		} as const),
	},
) { }

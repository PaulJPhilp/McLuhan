import { Effect } from "effect";
import { SpecNotFoundError } from "../errors.js";
import type { ActorSpec } from "./types.js";

/**
 * SpecRegistryApi - manages actor specifications
 *
 * Provides:
 * - register(spec) - Register a new actor spec
 * - get(id) - Retrieve a spec by ID
 * - all() - Get all registered specs
 */
export interface SpecRegistryApi {
	/**
	 * Register an actor spec
	 * @param spec - The actor spec to register
	 */
	readonly register: (spec: ActorSpec) => Effect.Effect<void>;

	/**
	 * Get a spec by ID
	 * @param id - The spec ID (should match actorType)
	 * @returns The spec if found, or SpecNotFoundError
	 */
	readonly get: (id: string) => Effect.Effect<ActorSpec, SpecNotFoundError>;

	/**
	 * Get all registered specs
	 * @returns Array of all specs
	 */
	readonly all: () => Effect.Effect<ActorSpec[]>;

	/**
	 * Check if a spec is registered
	 * @param id - The spec ID to check
	 */
	readonly has: (id: string) => Effect.Effect<boolean>;
}

/**
 * SpecRegistry service - manages actor specifications
 *
 * Provides:
 * - register(spec) - Register a new actor spec
 * - get(id) - Retrieve a spec by ID
 * - all() - Get all registered specs
 */
export class SpecRegistry extends Effect.Service<SpecRegistry>()(
	"effect-actor/SpecRegistry",
	{
		effect: Effect.gen(function* () {
			const specs = new Map<string, ActorSpec>();

			return {
				/**
				 * Register an actor spec
				 * @param spec - The actor spec to register
				 */
				register: (spec: ActorSpec) => {
					specs.set(spec.id, spec);
					return Effect.void;
				},

				/**
				 * Get a spec by ID
				 * @param id - The spec ID (should match actorType)
				 * @returns The spec if found, or SpecNotFoundError
				 */
				get: (id: string) =>
					specs.has(id)
						? Effect.succeed(specs.get(id)!)
						: Effect.fail(
							new SpecNotFoundError({
								actorType: id,
								availableSpecs: Array.from(specs.keys()),
							}),
						),

				/**
				 * Get all registered specs
				 * @returns Array of all specs
				 */
				all: () => Effect.succeed(Array.from(specs.values())),

				/**
				 * Check if a spec is registered
				 * @param id - The spec ID to check
				 */
				has: (id: string) => Effect.succeed(specs.has(id)),
			} satisfies SpecRegistryApi;
		}),
	},
) { }

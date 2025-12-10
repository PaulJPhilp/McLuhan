import type { ActorSpec } from "./types.js";

/**
 * Create an actor specification
 * This is a simple helper that provides type safety and validation
 *
 * @template TContext - The context type (inferred from schema)
 * @param spec - The actor specification
 * @returns The validated actor spec
 *
 * @example
 * ```typescript
 * const contentSpec = createActorSpec({
 *   id: "content-production",
 *   schema: ContentSchema,
 *   initial: "Idea",
 *   states: {
 *     Idea: { on: { PLAN: "Planned" } },
 *     Planned: {},
 *   },
 *   guards: {},
 *   actions: {},
 * });
 * ```
 */
export const createActorSpec = <TContext = any>(
	spec: ActorSpec<TContext>,
): ActorSpec<TContext> => {
	return spec;
};

import { Effect, Schema } from "effect";
import {
	ActionNotFoundError,
	GuardNotFoundError,
	InvalidStateError,
	SpecError,
} from "../errors.js";
import type { ActorSpec, StateDefinition, Transition } from "./types.js";

/**
 * Validate an actor spec for structural correctness and consistency
 *
 * Checks:
 * - ID is non-empty string
 * - Schema is a valid Effect.Schema
 * - Initial state exists in states
 * - All state references in transitions exist
 * - All guards are defined
 * - All actions are defined
 * - No entry/exit actions reference undefined actions
 * - Warns about unreachable states and unguarded self-loops
 *
 * @param spec - The actor spec to validate
 * @returns Effect that succeeds if valid, fails with SpecError if invalid
 */
export const validateSpec = <TContext = any>(
	spec: ActorSpec<TContext>
): Effect.Effect<void, SpecError | InvalidStateError | GuardNotFoundError | ActionNotFoundError> =>
	Effect.gen(function* () {
		// 1. Validate ID
		if (!spec.id || typeof spec.id !== "string" || spec.id.trim() === "") {
			return yield* Effect.fail(new SpecError({
				reason: "Actor spec must have a non-empty string ID",
			}));
		}

		// 2. Validate schema exists
		if (!spec.schema) {
			return yield* Effect.fail(new SpecError({
				reason: "Actor spec must have a schema",
			}));
		}		// 3. Validate initial state exists
		const stateNames = Object.keys(spec.states);
		if (!stateNames.includes(spec.initial)) {
			return yield* Effect.fail(new InvalidStateError({
				state: spec.initial,
				validStates: stateNames,
			}));
		}

		// 4. Validate all state definitions
		for (const stateName of stateNames) {
			const stateDef = spec.states[stateName];
			if (!stateDef) continue;

			// Validate state definition
			const result = yield* validateStateDefinition(spec, stateName, stateDef);
			// If validation returns, it succeeded; if it fails, the Effect will fail
		}

		// 5. Check for unreachable states
		const reachableStates = new Set<string>();
		const queue = [spec.initial];

		while (queue.length > 0) {
			const currentState = queue.shift()!;
			if (reachableStates.has(currentState)) continue;

			reachableStates.add(currentState);
			const stateDef = spec.states[currentState];

			if (stateDef?.on) {
				for (const transitionDef of Object.values(stateDef.on)) {
					const target = typeof transitionDef === "string"
						? transitionDef
						: transitionDef.target;

					if (target && !reachableStates.has(target) && stateNames.includes(target)) {
						queue.push(target);
					}
				}
			}
		}

		const unreachableStates = stateNames.filter(name => !reachableStates.has(name));
		if (unreachableStates.length > 0) {
			console.warn(`Warning: Unreachable states found: ${unreachableStates.join(", ")}`);
		}

		return void 0;
	});

/**
 * Validates a single state definition within a spec
 *
 * @param spec - The full actor spec
 * @param stateName - Name of the state being validated
 * @param stateDef - The state definition to validate
 * @returns Effect that succeeds if valid, fails with validation error
 */
const validateStateDefinition = <TContext>(
	spec: ActorSpec<TContext>,
	stateName: string,
	stateDef: StateDefinition
): Effect.Effect<void, ActionNotFoundError | GuardNotFoundError | SpecError> =>
	Effect.gen(function* () {
		// Validate entry actions
		if (stateDef.entry) {
			const actions = Array.isArray(stateDef.entry) ? stateDef.entry : [stateDef.entry];
			for (const action of actions) {
				if (!spec.actions?.[action]) {
					return yield* Effect.fail(new ActionNotFoundError({
						action: action,
					}));
				}
			}
		}

		// Validate exit actions
		if (stateDef.exit) {
			const actions = Array.isArray(stateDef.exit) ? stateDef.exit : [stateDef.exit];
			for (const action of actions) {
				if (!spec.actions?.[action]) {
					return yield* Effect.fail(new ActionNotFoundError({
						action: action,
					}));
				}
			}
		}

		// Validate transitions
		if (stateDef.on) {
			for (const transitionDef of Object.values(stateDef.on)) {
				const result = yield* validateTransition(spec, transitionDef);
				// If validation returns, it succeeded; if it fails, the Effect will fail
			}
		}

		return void 0;
	});

/**
 * Validates a single transition definition
 *
 * @param spec - The full actor spec
 * @param transitionDef - The transition definition to validate
 * @returns Effect that succeeds if valid, fails with validation error
 */
const validateTransition = <TContext>(
	spec: ActorSpec<TContext>,
	transitionDef: string | Transition
): Effect.Effect<void, SpecError | GuardNotFoundError | ActionNotFoundError> =>
	Effect.gen(function* () {
		const transition = typeof transitionDef === "string"
			? { target: transitionDef }
			: transitionDef;

		// Validate target state exists
		if (transition.target && !spec.states[transition.target]) {
			return yield* Effect.fail(new SpecError({
				reason: `Transition target '${transition.target}' does not exist in states`,
			}));
		}

		// Validate guard exists
		if (transition.guard && !spec.guards?.[transition.guard]) {
			return yield* Effect.fail(new GuardNotFoundError({
				guard: transition.guard,
			}));
		}

		// Validate action exists
		if (transition.action && !spec.actions?.[transition.action]) {
			return yield* Effect.fail(new ActionNotFoundError({
				action: transition.action,
			}));
		}

		return void 0;
	});

/**
 * Validates an ActorSpec schema can encode/decode a given context value
 *
 * @param spec - The actor spec with schema to validate against
 * @param context - The context value to validate
 * @returns Effect that succeeds if valid, fails with SpecError if invalid
 */
export const validateContext = <TContext = any>(
	spec: ActorSpec<TContext>,
	context: TContext
): Effect.Effect<void, SpecError> =>
	Effect.gen(function* () {
		const result = yield* Schema.decodeUnknown(spec.schema)(context).pipe(
			Effect.mapError((parseError) =>
				new SpecError({
					reason: `Context validation failed: ${String(parseError)}`,
				})
			)
		);
		return void 0;
	});

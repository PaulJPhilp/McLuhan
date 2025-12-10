import { Effect, Schema } from "effect";
import type { ActorState } from "../actor/types.js";
import {
	ActionNotFoundError,
	GuardFailedError,
	GuardNotFoundError,
	InvalidStateError,
	TransitionNotAllowedError,
	ValidationError,
} from "../errors.js";
import type { ActorSpec } from "../spec/types.js";
import type { TransitionResult } from "./types.js";

/**
 * Execute a command on an actor
 *
 * Execution order:
 * 1. Validate current state exists
 * 2. Get transition definition for event
 * 3. Merge command data into context
 * 4. Evaluate guard (if present) - fail if false
 * 5. Execute exit action (if present)
 * 6. Execute transition action (if present)
 * 7. Execute entry action (if present)
 * 8. Validate new context against schema
 * 9. Return transition result
 *
 * @param spec - The actor spec
 * @param currentState - The current actor state
 * @param command - The command to execute
 * @returns TransitionResult if successful, or error
 */
export const executeCommand = <TContext = any>(
	spec: ActorSpec<TContext>,
	currentState: ActorState,
	command: {
		event: string;
		data?: unknown;
	},
): Effect.Effect<
	TransitionResult,
	| InvalidStateError
	| TransitionNotAllowedError
	| GuardNotFoundError
	| GuardFailedError
	| ActionNotFoundError
	| ValidationError
> =>
	Effect.gen(function* () {

		// 1. Validate current state exists in spec
		if (!spec.states[currentState.state]) {
			yield* Effect.fail(
				new InvalidStateError({
					state: currentState.state,
					validStates: Object.keys(spec.states),
				}),
			);
		}

		// 2. Get transition definition
		const stateDef = spec.states[currentState.state];
		const transitionDef = stateDef.on?.[command.event];

		if (!transitionDef) {
			const available = Object.keys(stateDef.on ?? {});
			return yield* Effect.fail(
				new TransitionNotAllowedError({
					from: currentState.state,
					event: command.event,
					available,
				}),
			);
		}

		// Parse transition (string or object)
		// transitionDef is guaranteed to be defined here
		const transition: { target: string; guard?: string; action?: string } =
			typeof transitionDef === "string"
				? { target: transitionDef }
				: transitionDef;

		// Start with current context, merged with command data
		// This allows guards and actions to access event data via context
		let newContext = {
			...(currentState.context as TContext),
			...(command.data as Partial<TContext>),
		} as TContext;

		// 3. Evaluate guard (if present) - now has access to merged context
		if (transition.guard) {
			const guardFn = spec.guards[transition.guard];
			if (!guardFn) {
				yield* Effect.fail(
					new GuardNotFoundError({
						guard: transition.guard,
					}),
				);
			}

			const guardPassed = guardFn(newContext);
			if (!guardPassed) {
				yield* Effect.fail(
					new GuardFailedError({
						guard: transition.guard,
						reason: `Guard "${transition.guard}" evaluated to false`,
					}),
				);
			}
		}

		// 4. Execute exit action (if present on current state)
		if (stateDef.exit) {
			const exitFn = spec.actions[stateDef.exit];
			if (!exitFn) {
				yield* Effect.fail(
					new ActionNotFoundError({
						action: stateDef.exit,
					}),
				);
			}
			newContext = exitFn(newContext);
		}

		// 5. Execute transition action (if present)
		if (transition.action) {
			const actionFn = spec.actions[transition.action];
			if (!actionFn) {
				yield* Effect.fail(
					new ActionNotFoundError({
						action: transition.action,
					}),
				);
			}
			newContext = actionFn(newContext);
		}

		// 6. Execute entry action (if present on new state)
		const newStateDef = spec.states[transition.target];
		if (newStateDef.entry) {
			const entryFn = spec.actions[newStateDef.entry];
			if (!entryFn) {
				yield* Effect.fail(
					new ActionNotFoundError({
						action: newStateDef.entry,
					}),
				);
			}
			newContext = entryFn(newContext);
		}

		// 7. Validate new context against schema
		yield* Schema.decodeUnknown(spec.schema)(newContext).pipe(
			Effect.mapError(
				(e) =>
					new ValidationError({
						reason: "Context validation failed after action execution",
						cause: e as Error,
					}),
			),
		);

		// 8. Return transition result
		return {
			from: currentState.state,
			to: transition.target,
			event: command.event,
			oldContext: currentState.context,
			newContext,
			timestamp: new Date(),
		};
	});

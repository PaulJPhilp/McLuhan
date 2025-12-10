import { Effect, Layer } from "effect";
import type { AuditEntry } from "../audit.js";
import { ActionNotFoundError, GuardFailedError, GuardNotFoundError, InvalidStateError, SpecNotFoundError, StorageError, TransitionNotAllowedError, ValidationError } from "../errors.js";
import { executeCommand } from "../machine/transition.js";
import type { TransitionResult } from "../machine/types.js";
import { ComputeProvider } from "../providers/compute.js";
import { StorageProvider } from "../providers/storage.js";
import { SpecRegistry } from "../spec/registry.js";
import type { ActorSpec } from "../spec/types.js";
import type { ActorState, ExecuteCommand, QueryFilter } from "./types.js";

/**
 * ActorService API interface
 */
export interface ActorServiceApi {
	readonly _tag: "effect-actor/ActorService";

	/**
	 * Execute a command on an actor
	 * @param command - The command to execute
	 * @returns Execution result with new state
	 */
	execute(command: ExecuteCommand): Effect.Effect<TransitionResult, StorageError | SpecNotFoundError | InvalidStateError | TransitionNotAllowedError | GuardNotFoundError | GuardFailedError | ActionNotFoundError | ValidationError>;

	/**
	 * Query current state of an actor
	 * @param actorType - The actor type
	 * @param actorId - The actor ID
	 * @returns Current state or error
	 */
	query(actorType: string, actorId: string): Effect.Effect<ActorState, StorageError | SpecNotFoundError | InvalidStateError>;

	/**
	 * List actors by filter
	 * @param actorType - The actor type
	 * @param filter - Optional filter criteria
	 * @returns Array of matching actor states
	 */
	list(actorType: string, filter?: QueryFilter): Effect.Effect<ActorState[], StorageError>;

	/**
	 * Get audit history for an actor
	 * @param actorType - The actor type
	 * @param actorId - The actor ID
	 * @param limit - Maximum number of entries to return
	 * @param offset - Number of entries to skip
	 * @returns Audit history
	 */
	getHistory(
		actorType: string,
		actorId: string,
		limit?: number,
		offset?: number,
	): Effect.Effect<AuditEntry[], StorageError>;

	/**
	 * Check if a transition is allowed
	 * @param actorType - The actor type
	 * @param actorId - The actor ID
	 * @param event - The event to check
	 * @returns Transition check result
	 */
	canTransition(
		actorType: string,
		actorId: string,
		event: string,
	): Effect.Effect<TransitionCheck, StorageError | SpecNotFoundError>;

	/**
	 * Get actor spec by type
	 * @param actorType - The actor type
	 * @returns The actor spec
	 */
	getSpec(actorType: string): Effect.Effect<ActorSpec, SpecNotFoundError>;
}

/**
 * Execute result
 */
export interface ExecuteResult {
	newState: ActorState;
	auditEntry: AuditEntry;
}

/**
 * Transition check result
 */
export interface TransitionCheck {
	allowed: boolean;
	reason?: string;
	target?: string;
}

/**
 * ActorService - main orchestrator for actor operations
 *
 * Provides:
 * - execute(command) - Execute a command and persist state
 * - query(actorType, actorId) - Get current state
 * - list(actorType, filter) - List actors by filter
 * - getHistory(actorType, actorId) - Get audit trail
 * - canTransition(actorType, actorId, event) - Check if transition allowed
 * - getSpec(actorType) - Get actor spec
 */
export class ActorService extends Effect.Service<ActorService>()(
	"effect-actor/ActorService",
	{
		effect: Effect.gen(function* () {
			const storage = yield* StorageProvider;
			const compute = yield* ComputeProvider;
			const specRegistry = yield* SpecRegistry;

			return {
				_tag: "effect-actor/ActorService" as const,
				/**
				 * Execute a command on an actor
				 * @param command - The command to execute
				 * @returns Execution result with new state
				 */
				execute: (command: ExecuteCommand) =>
					Effect.gen(function* () {
						const startTime = new Date();

						// 1. Get spec
						const spec = yield* specRegistry.get(command.actorType);

						// 2. Load or initialize state
						const currentState = yield* storage
							.load(command.actorType, command.actorId)
							.pipe(
								Effect.orElse(() =>
									// Initialize new actor with spec's initial state
									// Empty context - let actions populate it from command.data
									Effect.succeed({
										id: command.actorId,
										actorType: command.actorType,
										state: spec.initial,
										context: {},
										version: 0,
										createdAt: startTime,
										updatedAt: startTime,
									}),
								),
							);

						// 3. Execute transition
						const result = yield* executeCommand(spec, currentState, {
							event: command.event,
							data: command.data,
						});

						// 4. Persist new state
						const newState: ActorState = {
							id: currentState.id,
							actorType: currentState.actorType,
							state: result.to,
							context: result.newContext,
							version: currentState.version + 1,
							createdAt: currentState.createdAt,
							updatedAt: startTime,
						};

						const auditEntry: AuditEntry = {
							id: crypto.randomUUID(),
							timestamp: startTime,
							actorType: command.actorType,
							actorId: command.actorId,
							event: command.event,
							from: currentState.state,
							to: result.to,
							actor: command.actor,
							data: command.data,
							result: "success",
							duration: Date.now() - startTime.getTime(),
						};

						yield* storage.save(command.actorType, command.actorId, newState, auditEntry);

						return result;
					}),

				/**
				 * Query current state of an actor
				 * @param actorType - The actor type
				 * @param actorId - The actor ID
				 * @returns Current state or error
				 */
				query: (actorType: string, actorId: string) =>
					Effect.gen(function* () {
						const spec = yield* specRegistry.get(actorType);
						const state = yield* storage.load(actorType, actorId);

						// Validate state against spec
						const validStates = Object.keys(spec.states);
						if (!validStates.includes(state.state)) {
							return yield* Effect.fail(
								new InvalidStateError({
									state: state.state,
									validStates,
								}),
							);
						}

						return state;
					}),

				/**
				 * List actors by filter
				 * @param actorType - The actor type
				 * @param filter - Optional filter criteria
				 * @returns Array of matching actor states
				 */
				list: (actorType: string, filter?: QueryFilter) =>
					storage.query(actorType, filter),

				/**
				 * Get audit history for an actor
				 * @param actorType - The actor type
				 * @param actorId - The actor ID
				 * @param limit - Maximum number of entries to return
				 * @param offset - Number of entries to skip
				 * @returns Audit history
				 */
				getHistory: (
					actorType: string,
					actorId: string,
					limit?: number,
					offset?: number,
				) => storage.getHistory(actorType, actorId, limit, offset),

				/**
				 * Check if a transition is allowed
				 * @param actorType - The actor type
				 * @param actorId - The actor ID
				 * @param event - The event to check
				 * @returns Transition check result
				 */
				canTransition: (actorType: string, actorId: string, event: string) =>
					Effect.gen(function* () {
						const spec = yield* specRegistry.get(actorType);
						const state = yield* storage.load(actorType, actorId);

						const transition = spec.states[state.state]?.on?.[event];
						if (!transition) {
							return {
								allowed: false,
								reason: `Event "${event}" not allowed from state "${state.state}"`,
							};
						}

						// Handle string transitions
						const transitionDef = typeof transition === 'string' ? { target: transition } : transition;

						// Check guard if present
						if (transitionDef.guard) {
							const guardFn = spec.guards[transitionDef.guard];
							if (guardFn && !guardFn(state.context)) {
								return {
									allowed: false,
									reason: `Guard "${transitionDef.guard}" fails`,
								};
							}
						}

						return {
							allowed: true,
							target: transitionDef.target,
						};
					}),

				/**
				 * Get actor spec by type
				 * @param actorType - The actor type
				 * @returns The actor spec
				 */
				getSpec: (actorType: string) => specRegistry.get(actorType),
			} satisfies ActorServiceApi;
		}),
	},
) { }

/**
 * Layer that provides ActorService with its built-in implementation
 * Requires: StorageProvider, ComputeProvider, SpecRegistry to be available in context
 */
export const ActorServiceLive = Layer.effect(
	ActorService,
	Effect.gen(function* () {
		const storage = yield* StorageProvider;
		const compute = yield* ComputeProvider;
		const specRegistry = yield* SpecRegistry;

		return {
			_tag: "effect-actor/ActorService" as const,
			execute: (command: ExecuteCommand) =>
				Effect.gen(function* () {
					console.log(`[ActorServiceLive] execute: ${command.event} on ${command.actorType}:${command.actorId}`);
					const startTime = new Date();
					const spec = yield* specRegistry.get(command.actorType);
					console.log(`[ActorServiceLive] got spec`);
					const initialState: ActorState = {
						id: command.actorId,
						actorType: command.actorType,
						state: spec.initial,
						context: {},
						version: 0,
						createdAt: startTime,
						updatedAt: startTime,
					};
					// Try to load existing state, or use initial state
					const currentState = yield* storage
						.load(command.actorType, command.actorId)
						.pipe(
							Effect.catchAll(() => Effect.succeed(initialState)),
						);
					console.log(`[ActorServiceLive] using state:`, currentState.state);
					const result = yield* executeCommand(spec, currentState, {
						event: command.event,
						data: command.data,
					});
					console.log(`[ActorServiceLive] executeCommand result:`, result.from, "->", result.to);
					const newState: ActorState = {
						id: currentState.id,
						actorType: currentState.actorType,
						state: result.to,
						context: result.newContext,
						version: currentState.version + 1,
						createdAt: currentState.createdAt,
						updatedAt: startTime,
					};
					const auditEntry: AuditEntry = {
						id: crypto.randomUUID(),
						timestamp: startTime,
						actorType: command.actorType,
						actorId: command.actorId,
						event: command.event,
						from: currentState.state,
						to: result.to,
						actor: command.actor,
						data: command.data,
						result: "success",
						duration: Date.now() - startTime.getTime(),
					};
					console.log(`[ActorServiceLive] calling storage.save`);
					yield* storage.save(command.actorType, command.actorId, newState, auditEntry);
					console.log(`[ActorServiceLive] save complete, returning result`);
					return result;
				}),
			query: (actorType: string, actorId: string) =>
				Effect.gen(function* () {
					const spec = yield* specRegistry.get(actorType);
					const state = yield* storage.load(actorType, actorId);
					const validStates = Object.keys(spec.states);
					if (!validStates.includes(state.state)) {
						return yield* Effect.fail(
							new InvalidStateError({
								state: state.state,
								validStates,
							}),
						);
					}
					return state;
				}),
			list: (actorType: string, filter?: QueryFilter) =>
				storage.query(actorType, filter),
			getHistory: (
				actorType: string,
				actorId: string,
				limit?: number,
				offset?: number,
			) => storage.getHistory(actorType, actorId, limit, offset),
			canTransition: (actorType: string, actorId: string, event: string) =>
				Effect.gen(function* () {
					const spec = yield* specRegistry.get(actorType);
					const state = yield* storage.load(actorType, actorId);
					const transition = spec.states[state.state]?.on?.[event];
					if (!transition) {
						return {
							allowed: false,
							reason: `Event "${event}" not allowed from state "${state.state}"`,
						};
					}
					const transitionDef = typeof transition === 'string' ? { target: transition } : transition;
					if (transitionDef.guard) {
						const guardFn = spec.guards[transitionDef.guard];
						if (guardFn && !guardFn(state.context)) {
							return {
								allowed: false,
								reason: `Guard "${transitionDef.guard}" fails`,
							};
						}
					}
					return {
						allowed: true,
						target: transitionDef.target,
					};
				}),
			getSpec: (actorType: string) => specRegistry.get(actorType),
		} satisfies ActorServiceApi;
	}),
);
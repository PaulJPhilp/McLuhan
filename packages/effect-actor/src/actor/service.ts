import { Effect, Layer } from "effect";
import { AuditLog, type AuditEntry } from "../audit.js";
import {
	ActionNotFoundError,
	GuardFailedError,
	GuardNotFoundError,
	InvalidStateError,
	SpecNotFoundError,
	StorageError,
	TransitionNotAllowedError,
	ValidationError,
} from "../errors.js";
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
	/**
	 * Execute a command on an actor
	 * @param command - The command to execute
	 * @returns Execution result with new state
	 */
	readonly execute: (
		command: ExecuteCommand,
	) => Effect.Effect<
		TransitionResult,
		| StorageError
		| SpecNotFoundError
		| InvalidStateError
		| TransitionNotAllowedError
		| GuardNotFoundError
		| GuardFailedError
		| ActionNotFoundError
		| ValidationError,
		never
	>;

	/**
	 * Query current state of an actor
	 * @param actorType - The actor type
	 * @param actorId - The actor ID
	 * @returns Current state or error
	 */
	readonly query: (
		actorType: string,
		actorId: string,
	) => Effect.Effect<
		ActorState,
		StorageError | SpecNotFoundError | InvalidStateError,
		never
	>;

	/**
	 * List actors by filter
	 * @param actorType - The actor type
	 * @param filter - Optional filter criteria
	 * @returns Array of matching actor states
	 */
	readonly list: (
		actorType: string,
		filter?: QueryFilter | undefined,
	) => Effect.Effect<ActorState[], StorageError, never>;

	/**
	 * Get audit history for an actor
	 * @param actorType - The actor type
	 * @param actorId - The actor ID
	 * @param limit - Maximum number of entries to return
	 * @param offset - Number of entries to skip
	 * @returns Audit history
	 */
	readonly getHistory: (
		actorType: string,
		actorId: string,
		limit?: number | undefined,
		offset?: number | undefined,
	) => Effect.Effect<AuditEntry[], StorageError, never>;

	/**
	 * Check if a transition is allowed
	 * @param actorType - The actor type
	 * @param actorId - The actor ID
	 * @param event - The event to check
	 * @returns Transition check result
	 */
	readonly canTransition: (
		actorType: string,
		actorId: string,
		event: string,
	) => Effect.Effect<TransitionCheck, StorageError | SpecNotFoundError, never>;

	/**
	 * Get actor spec by type
	 * @param actorType - The actor type
	 * @returns The actor spec
	 */
	readonly getSpec: (
		actorType: string,
	) => Effect.Effect<ActorSpec, SpecNotFoundError, never>;
}

/**
 * Transition check result
 */
export interface TransitionCheck {
	readonly allowed: boolean;
	readonly reason?: string | undefined;
	readonly target?: string | undefined;
}

/**
 * ActorService - main orchestrator for actor operations
 */
export class ActorService extends Effect.Service<ActorService>()(
	"effect-actor/ActorService",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const storage = yield* StorageProvider;
			const specRegistry = yield* SpecRegistry;
			const auditLog = yield* AuditLog;

			return {
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
									Effect.succeed({
										id: command.actorId,
										actorType: command.actorType,
										state: spec.initial,
										context: {},
										version: 0,
										createdAt: startTime,
										updatedAt: startTime,
									} satisfies ActorState),
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

						yield* storage.save(
							command.actorType,
							command.actorId,
							newState,
							auditEntry,
						);

						// Also record in audit log service
						yield* auditLog.record(auditEntry);

						return result;
					}),

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
							} satisfies TransitionCheck;
						}

						// Handle string transitions
						const transitionDef =
							typeof transition === "string" ? { target: transition } : transition;

						// Check guard if present
						if (transitionDef.guard) {
							const guardFn = spec.guards[transitionDef.guard];
							if (guardFn && !guardFn(state.context)) {
								return {
									allowed: false,
									reason: `Guard "${transitionDef.guard}" fails`,
								} satisfies TransitionCheck;
							}
						}

						return {
							allowed: true,
							target: transitionDef.target,
						} satisfies TransitionCheck;
					}),

				getSpec: (actorType: string) => specRegistry.get(actorType),
			} satisfies ActorServiceApi;
		}),
	},
) {}

/**
 * Default live implementation of ActorService with all dependencies wired up
 */
export const ActorServiceLive = ActorService.Default.pipe(
	Layer.provide(StorageProvider.Default),
	Layer.provide(ComputeProvider.Default),
	Layer.provide(SpecRegistry.Default),
	Layer.provide(AuditLog.Default),
);

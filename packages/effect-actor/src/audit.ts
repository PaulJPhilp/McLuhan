import { Effect, Layer } from "effect";
import { StorageProvider } from "./providers/storage.js";
import { ActorState } from "./actor/types.js";
import { SpecRegistry } from "./spec/registry.js";
import { executeCommand } from "./machine/transition.js";
import { StorageError } from "./errors.js";

/**
 * Audit entry for a single transition (success or failure)
 */
export interface AuditEntry {
	readonly id: string;
	readonly timestamp: Date;
	readonly actorType: string;
	readonly actorId: string;
	readonly event: string;
	readonly from: string;
	readonly to?: string | undefined; // undefined if transition failed
	readonly actor?: string | undefined; // WHO executed this
	readonly data?: unknown | undefined;
	readonly action?: string | undefined; // Which action was executed (for replay)
	readonly result: "success" | "failed";
	readonly error?: string | undefined; // Error message if failed
	readonly duration: number; // milliseconds
}

/**
 * Filters for querying audit history
 */
export interface AuditFilters {
	readonly fromTimestamp?: Date | undefined;
	readonly toTimestamp?: Date | undefined;
	readonly event?: string | undefined;
	readonly actor?: string | undefined;
	readonly result?: "success" | "failed" | undefined;
	readonly limit?: number | undefined;
	readonly offset?: number | undefined;
}

/**
 * AuditLog service API
 */
export interface AuditLogApi {
	/**
	 * Record an audit entry
	 */
	readonly record: (entry: AuditEntry) => Effect.Effect<void, never, never>;

	/**
	 * Query audit history
	 */
	readonly query: (
		actorType: string,
		actorId: string,
		filters?: AuditFilters | undefined,
	) => Effect.Effect<readonly AuditEntry[], StorageError, never>;

	/**
	 * Replay events to reconstruct state up to a point in time
	 */
	readonly replay: (
		actorType: string,
		actorId: string,
		upToTimestamp?: Date | undefined,
	) => Effect.Effect<ActorState, any, never>;
}

/**
 * AuditLog service - manages the audit trail and state reconstruction
 */
export class AuditLog extends Effect.Service<AuditLog>()("effect-actor/AuditLog", {
	effect: Effect.gen(function* () {
		const storage = yield* StorageProvider;
		const specRegistry = yield* SpecRegistry;

		return {
			record: (entry: AuditEntry) =>
				// For now, recording is handled atomically by StorageProvider.save in ActorService
				// This could be used for secondary indexing or external audit logs
				Effect.void,

			query: (actorType, actorId, filters) =>
				storage.getHistory(actorType, actorId, filters?.limit, filters?.offset),

			replay: (actorType, actorId, upToTimestamp) =>
				Effect.gen(function* () {
					const spec = yield* specRegistry.get(actorType);
					const history = yield* storage.getHistory(actorType, actorId);

					const filteredHistory = upToTimestamp
						? history.filter((e: AuditEntry) => e.timestamp <= upToTimestamp)
						: history;

					// Replay logic: start from initial state and apply successful transitions
					let currentState: ActorState = {
						id: actorId,
						actorType,
						state: spec.initial,
						context: {},
						version: 0,
						createdAt: history[history.length - 1]?.timestamp ?? new Date(),
						updatedAt: history[history.length - 1]?.timestamp ?? new Date(),
					};

					// History is newest first, so we reverse it for replay
					const chronological = [...filteredHistory].reverse();

					for (const entry of chronological) {
						if (entry.result === "success") {
							const result = yield* executeCommand(spec, currentState, {
								event: entry.event,
								data: entry.data,
							});

							currentState = {
								id: actorId,
								actorType,
								state: result.to,
								context: result.newContext,
								version: currentState.version + 1,
								createdAt: currentState.createdAt,
								updatedAt: entry.timestamp,
							};
						}
					}

					return currentState;
				}),
		} satisfies AuditLogApi;
	}),
}) {}

/**
 * Default live implementation of AuditLog with all dependencies wired up
 */
export const AuditLogLive = AuditLog.Default.pipe(
	Layer.provide(StorageProvider.Default),
	Layer.provide(SpecRegistry.Default),
);
import { Effect } from "effect";
import type { ActorState, QueryFilter } from "../actor/types.js";
import type { AuditEntry } from "../audit.js";
import { StorageError } from "../errors.js";

/**
 * StorageProviderApi - handles persistence of actor state and audit trail
 *
 * Implementations should:
 * - Store state and audit together atomically
 * - Support querying by various filters
 * - Handle concurrent access safely
 */
export interface StorageProviderApi {
	/**
	 * Save actor state and audit entry atomically
	 * @param actorType - The actor type
	 * @param actorId - The actor ID
	 * @param state - The current state snapshot
	 * @param audit - The audit entry for this transition
	 */
	readonly save: (
		actorType: string,
		actorId: string,
		state: ActorState,
		audit: AuditEntry,
	) => Effect.Effect<void, StorageError>;

	/**
	 * Load actor state
	 * @param actorType - The actor type
	 * @param actorId - The actor ID
	 * @returns The actor state, or StorageError if not found
	 */
	readonly load: (
		actorType: string,
		actorId: string,
	) => Effect.Effect<ActorState, StorageError>;

	/**
	 * Query actors by filter
	 * @param actorType - The actor type
	 * @param filter - Query filters (status, date range, etc.)
	 * @returns Array of matching actor states
	 */
	readonly query: (
		actorType: string,
		filter?: QueryFilter,
	) => Effect.Effect<ActorState[], StorageError>;

	/**
	 * Get audit history for an actor
	 * @param actorType - The actor type
	 * @param actorId - The actor ID
	 * @param limit - Maximum number of entries to return
	 * @param offset - Number of entries to skip
	 * @returns Array of audit entries, ordered by timestamp (newest first)
	 */
	readonly getHistory: (
		actorType: string,
		actorId: string,
		limit?: number,
		offset?: number,
	) => Effect.Effect<AuditEntry[], StorageError>;
}

/**
 * StorageProvider service - pluggable storage backend for actor persistence
 *
 * Uses Effect.Service pattern with external configuration.
 * Backends provide implementations via Layer.succeed(StorageProvider, impl)
 */
export class StorageProvider extends Effect.Service<StorageProvider>()(
	"effect-actor/StorageProvider",
	{
		accessors: true,
		effect: Effect.sync(
			(): StorageProviderApi => ({
				save: () =>
					Effect.fail(
						new StorageError({
							backend: "none",
							operation: "save",
							reason: "No storage provider provided",
						}),
					),
				load: () =>
					Effect.fail(
						new StorageError({
							backend: "none",
							operation: "load",
							reason: "No storage provider provided",
						}),
					),
				query: () =>
					Effect.fail(
						new StorageError({
							backend: "none",
							operation: "query",
							reason: "No storage provider provided",
						}),
					),
				getHistory: () =>
					Effect.fail(
						new StorageError({
							backend: "none",
							operation: "getHistory",
							reason: "No storage provider provided",
						}),
					),
			}),
		),
	},
) {}

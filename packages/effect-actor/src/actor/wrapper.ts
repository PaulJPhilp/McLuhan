import { Effect } from "effect";
import { ActorService } from "./service.js";
import type { ExecuteCommand, ActorState, QueryFilter } from "./types.js";
import type { AuditEntry } from "../audit.js";

/**
 * ActorWrapper - non-Effect API for working with actors
 *
 * Provides a Promise-based interface for developers not yet using Effect.
 * Delegates all operations to the ActorService.
 */
export class ActorWrapper {
	constructor(private readonly service: ActorService) {}

	/**
	 * Execute a command on an actor
	 */
	async execute(command: ExecuteCommand): Promise<ActorState> {
		const result = await Effect.runPromise(this.service.execute(command));
		// The service currently returns TransitionResult, we want the new state
		// We'll query it to be sure it was persisted correctly
		return Effect.runPromise(
			this.service.query(command.actorType, command.actorId),
		);
	}

	/**
	 * Query current state of an actor
	 */
	async query(actorType: string, actorId: string): Promise<ActorState> {
		return Effect.runPromise(this.service.query(actorType, actorId));
	}

	/**
	 * List actors by filter
	 */
	async list(actorType: string, filter?: QueryFilter): Promise<ActorState[]> {
		return Effect.runPromise(this.service.list(actorType, filter));
	}

	/**
	 * Get audit history for an actor
	 */
	async getHistory(
		actorType: string,
		actorId: string,
		limit?: number,
		offset?: number,
	): Promise<AuditEntry[]> {
		return Effect.runPromise(
			this.service.getHistory(actorType, actorId, limit, offset),
		);
	}

	/**
	 * Check if a transition is allowed
	 */
	async canTransition(
		actorType: string,
		actorId: string,
		event: string,
	): Promise<{ allowed: boolean; reason?: string; target?: string }> {
		return Effect.runPromise(
			this.service.canTransition(actorType, actorId, event),
		);
	}
}
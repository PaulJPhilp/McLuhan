import { Effect } from "effect";

/**
 * Command to execute on an actor
 */
export type ExecuteCommand = {
	actorType: string;
	actorId: string;
	event: string;
	data?: unknown;
	actor?: string; // WHO executed this (for audit trail)
};

/**
 * Actor state snapshot
 */
export type ActorState = {
	id: string;
	actorType: string;
	state: string;
	context: unknown;
	version: number;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Result of executing a command/transition
 */
export type ExecutionResult = {
	from: string;
	to: string;
	event: string;
	oldContext: any;
	newContext: any;
	timestamp: Date;
};

/**
 * Query filter for listing actors
 */
export type QueryFilter = {
	status?: string;
	limit?: number;
	offset?: number;
	createdAfter?: Date;
	createdBefore?: Date;
	updatedAfter?: Date;
	updatedBefore?: Date;
};

/**
 * Reference to an actor that can receive messages
 */
export interface ActorRef<M, R = never> {
	/**
	 * Send a message to the actor
	 * @param message - The message to send
	 * @returns Effect that completes when message is processed
	 */
	send(message: M): Effect.Effect<void, Error, R>;
}

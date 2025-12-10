import { Effect, Schedule } from "effect";
import { PolicyError } from "../errors.js";

/**
 * Retry policy configuration
 */
export type RetryPolicy = {
	maxAttempts: number;
	backoff: Schedule.Schedule<unknown, unknown, unknown>;
};

/**
 * Rate limit policy configuration
 */
export type RateLimitPolicy = {
	tokensPerSecond: number;
};

/**
 * PolicyProvider service - handles authorization, retry, and rate limiting
 *
 * Default implementation allows all operations
 */
export class PolicyProvider extends Effect.Service<PolicyProvider>()(
	"effect-actor/PolicyProvider",
	{
		effect: Effect.succeed({
			/**
			 * Check if an actor can execute an event
			 * @param actor - WHO is executing (user/system identifier)
			 * @param actorType - The actor type
			 * @param event - The event being executed
			 * @returns true if allowed, PolicyError if denied
			 */
			canExecute: (
				_actor: string,
				_actorType: string,
				_event: string,
			): Effect.Effect<boolean, PolicyError> => Effect.succeed(true),

			/**
			 * Get retry policy for an event
			 * @param _event - The event type
			 * @returns Retry policy configuration
			 */
			getRetryPolicy: (_event: string): RetryPolicy => ({
				maxAttempts: 3,
				backoff: Schedule.exponential("100 millis"),
			}),

			/**
			 * Get rate limit policy for an event
			 * @param _event - The event type
			 * @returns Rate limit configuration
			 */
			getRateLimitPolicy: (_event: string): RateLimitPolicy => ({
				tokensPerSecond: 100,
			}),
		} as const),
	},
) {}

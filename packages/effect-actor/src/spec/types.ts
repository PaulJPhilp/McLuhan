import type { Schema } from "effect";

/**
 * Guard function type - evaluates a predicate over the context
 * @template TContext - The context type (inferred from schema)
 */
export type GuardFn<TContext = any> = (context: TContext) => boolean;

/**
 * Action function type - transforms the context
 * @template TContext - The context type (inferred from schema)
 */
export type ActionFn<TContext = any> = (context: TContext) => TContext;

/**
 * Transition definition - can be a simple state name or a complex transition with guards/actions
 */
export type Transition =
	| string // Direct state name
	| {
			target: string;
			guard?: string; // Guard name (must exist in spec.guards)
			action?: string; // Action name (must exist in spec.actions)
			data?: Record<string, unknown>;
	  };

/**
 * State definition - defines allowed transitions and entry/exit actions
 */
export type StateDefinition = {
	on?: Record<string, Transition>;
	entry?: string; // Action name to execute when entering this state
	exit?: string; // Action name to execute when exiting this state
};

/**
 * Actor specification - defines the state machine for an actor type
 * @template TContext - The context type (inferred from schema)
 */
export type ActorSpec<TContext = any> = {
	id: string;
	schema: Schema.Schema<TContext>;
	initial: string;
	states: Record<string, StateDefinition>;
	guards: Record<string, GuardFn<TContext>>;
	actions: Record<string, ActionFn<TContext>>;
};

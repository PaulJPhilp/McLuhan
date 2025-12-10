import { Effect } from "effect";
import { ActorRef } from "./types.js";

/**
 * Configuration for creating an actor
 */
export interface ActorConfig<S, M, R = never> {
    /** Initial state of the actor */
    initialState: S;
    /** Function to handle incoming messages */
    receive: (state: S, message: M) => Effect.Effect<S, Error, R>;
}

/**
 * High-level actor API
 */
export const Actor = {
    /**
     * Create a new actor with the given configuration
     *
     * @param config - Actor configuration
     * @returns Effect that produces an ActorRef for sending messages
     */
    make: <S, M, R = never>(
        config: ActorConfig<S, M, R>
    ): Effect.Effect<ActorRef<M, R>, never, R> => {
        // For now, return a simple implementation
        // This will be enhanced to integrate with the ActorService
        return Effect.gen(function* () {
            let currentState = config.initialState;

            const actorRef: ActorRef<M, R> = {
                send: (message: M) =>
                    Effect.gen(function* () {
                        const newState = yield* config.receive(currentState, message);
                        currentState = newState;
                        return undefined as void;
                    }),
            };

            return actorRef;
        });
    },
};
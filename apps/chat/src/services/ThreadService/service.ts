import { Effect, Ref } from "effect";
import {
	createThreadActorConfig,
	type ThreadMessage,
	type ThreadState,
} from "../../actors/ThreadActor.js";
import type { ThreadServiceApi } from "./api.js";

/**
 * Shared state Ref - singleton pattern ensures all ThreadService instances
 * share the same state, regardless of which runtime they're created in
 */
const sharedStateRef = Ref.unsafeMake<ThreadState>(
	(() => {
		const { initialState } = createThreadActorConfig();
		return initialState;
	})(),
);

/**
 * ThreadService - manages conversation state using ThreadActor
 * Uses a shared Ref pattern to ensure state is shared across all instances
 */
export class ThreadService extends Effect.Service<ThreadService>()(
	"chat/ThreadService",
	{
		effect: Effect.fn(function* () {
			const { receive } = createThreadActorConfig();

			return {
				getState: () => Ref.get(sharedStateRef),
				send: (message: ThreadMessage) =>
					Effect.gen(function* () {
						const currentState = yield* Ref.get(sharedStateRef);
						const newState = yield* receive(currentState, message);
						yield* Ref.set(sharedStateRef, newState);
					}),
				getMessages: () =>
					Effect.gen(function* () {
						const state = yield* Ref.get(sharedStateRef);
						return Object.freeze([...state.messages]);
					}),
				isLoading: () =>
					Effect.gen(function* () {
						const state = yield* Ref.get(sharedStateRef);
						return state.isLoading;
					}),
			} satisfies ThreadServiceApi;
		}),
	},
) {}

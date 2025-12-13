import { Effect } from 'effect'
import { createThreadActorConfig, ThreadMessage } from '../actors/ThreadActor'

/**
 * ThreadService - manages conversation state using ThreadActor
 */
export class ThreadService extends Effect.Service<ThreadService>()(
    'chat/ThreadService',
    {
        effect: Effect.gen(function* () {
            let state = createThreadActorConfig().initialState
            const { receive } = createThreadActorConfig()

            return {
                getState: () => Effect.sync(() => state),
                send: (message: ThreadMessage) =>
                    Effect.gen(function* () {
                        state = yield* receive(state, message)
                    }),
                getMessages: () => Effect.sync(() => Object.freeze([...state.messages])),
                isLoading: () => Effect.sync(() => state.isLoading),
            }
        }),
    }
) { }

import { Effect } from 'effect'
import { Message } from '../actors/ThreadActor'

/**
 * PersistenceService - manages thread state persistence
 */
export class PersistenceService extends Effect.Service<PersistenceService>()(
    'chat/PersistenceService',
    {
        sync: () => ({
            saveThread: (threadId: string, messages: readonly Message[]) =>
                Effect.sync(() => {
                    if (typeof window !== 'undefined' && window.localStorage) {
                        const data = window.localStorage.getItem('chat_threads') || '{}'
                        const threads = JSON.parse(data)
                        threads[threadId] = messages
                        window.localStorage.setItem('chat_threads', JSON.stringify(threads))
                    }
                }),
            loadThread: (threadId: string) =>
                Effect.sync(() => {
                    if (typeof window !== 'undefined' && window.localStorage) {
                        const data = window.localStorage.getItem('chat_threads') || '{}'
                        const threads = JSON.parse(data)
                        return threads[threadId] as Message[] | null
                    }
                    return null
                }),
            deleteThread: (threadId: string) =>
                Effect.sync(() => {
                    if (typeof window !== 'undefined' && window.localStorage) {
                        const data = window.localStorage.getItem('chat_threads') || '{}'
                        const threads = JSON.parse(data)
                        delete threads[threadId]
                        window.localStorage.setItem('chat_threads', JSON.stringify(threads))
                    }
                }),
            listThreads: () =>
                Effect.sync(() => {
                    if (typeof window !== 'undefined' && window.localStorage) {
                        const data = window.localStorage.getItem('chat_threads') || '{}'
                        const threads = JSON.parse(data)
                        return Object.keys(threads)
                    }
                    return []
                }),
        }),
    }
) { }



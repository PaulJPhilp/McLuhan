import { Effect, Layer } from 'effect'
import { createContext, FC, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { Message, ThreadMessage, ThreadState } from '../actors/ThreadActor'
import { ChatRuntime } from '../services/ChatRuntime'
import { HumeService } from '../services/HumeService'
import { ThreadService } from '../services/ThreadService'

/**
 * Chat context for providing services to components
 */
interface ChatContextValue {
    // Thread state
    state: ThreadState
    messages: readonly Message[]
    isLoading: boolean
    error: string | null

    // Thread actions
    addMessage: (role: 'user' | 'assistant' | 'system', content: string) => Promise<void>
    clearMessages: () => Promise<void>
    retryLastMessage: () => Promise<void>

    // Chat runtime
    sendMessage: (content: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

export const useChatContext = (): ChatContextValue => {
    const context = useContext(ChatContext)
    if (!context) {
        throw new Error('useChatContext must be used within ChatProvider')
    }
    return context
}

interface ChatProviderProps {
    children: ReactNode
}

/**
 * Provider component that sets up Effect services and manages state
 */
export const ChatProvider: FC<ChatProviderProps> = ({ children }) => {
    const [state, setState] = useState<ThreadState>({
        id: crypto.randomUUID(),
        messages: [],
        isLoading: false,
        error: undefined,
        lastUpdated: Date.now(),
    })

    // Initialize services on mount
    useEffect(() => {
        const initializeServices = async () => {
            const program = Effect.gen(function* () {
                const threadService = yield* ThreadService
                const currentState = yield* threadService.getState()
                setState(currentState)
            })

            const layer = Layer.merge(ThreadService.Default, HumeService.Default)

            await Effect.runPromise(Effect.provide(program, layer)).catch((err) => {
                console.error('Failed to initialize services:', err)
            })
        }

        initializeServices()
    }, [])

    const addMessage = useCallback(
        async (role: 'user' | 'assistant' | 'system', content: string) => {
            const message: ThreadMessage = {
                type: 'ADD_MESSAGE',
                payload: { role, content },
            }

            setState((prev) => ({
                ...prev,
                messages: [
                    ...prev.messages,
                    {
                        id: crypto.randomUUID(),
                        role,
                        content,
                        timestamp: Date.now(),
                    },
                ],
                lastUpdated: Date.now(),
            }))
        },
        [],
    )

    const clearMessages = useCallback(async () => {
        setState((prev) => ({
            ...prev,
            messages: [],
            error: undefined,
            lastUpdated: Date.now(),
        }))
    }, [])

    const retryLastMessage = useCallback(async () => {
        setState((prev) => {
            const lastUserMessageIndex = [...prev.messages]
                .reverse()
                .findIndex((m) => m.role === 'user')

            if (lastUserMessageIndex === -1) return prev

            const realIndex = prev.messages.length - 1 - lastUserMessageIndex

            return {
                ...prev,
                messages: prev.messages.slice(0, realIndex + 1),
                error: undefined,
                lastUpdated: Date.now(),
            }
        })
    }, [])

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim()) return

            // Add user message
            await addMessage('user', content)
            setState((prev) => ({ ...prev, isLoading: true, error: undefined }))

            try {
                // Stream response from AI
                let assistantMessage = ''

                const program = Effect.gen(function* () {
                    const runtime = yield* ChatRuntime
                    return runtime.streamResponse(state.messages as Message[])
                })

                const layer = ChatRuntime.Default
                const streamIterable = await Effect.runPromise(Effect.provide(program, layer))

                for await (const chunk of streamIterable) {
                    assistantMessage += chunk
                }

                // Add assistant response
                await addMessage('assistant', assistantMessage || 'No response generated')
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
                setState((prev) => ({
                    ...prev,
                    error: errorMessage,
                    isLoading: false,
                }))
            } finally {
                setState((prev) => ({ ...prev, isLoading: false }))
            }
        },
        [addMessage, state.messages],
    )

    const value: ChatContextValue = {
        state,
        messages: state.messages,
        isLoading: state.isLoading,
        error: state.error ?? null,
        addMessage,
        clearMessages,
        retryLastMessage,
        sendMessage,
    }

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

import { Effect, Layer } from 'effect'
import { FC, ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
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

    // Create service layer once
    const serviceLayerRef = useRef<Layer.Layer<ThreadService | ChatRuntime | HumeService, never, never> | null>(null)
    
    if (!serviceLayerRef.current) {
        // ChatRuntime.Default() returns a Layer (no config needed, uses env vars)
        // Note: The service will fail when accessed if no API key is configured
        const chatRuntimeLayer = ChatRuntime.Default()
        const mergedLayer = Layer.mergeAll(
            ThreadService.Default,
            chatRuntimeLayer,
            HumeService.Default,
        )
        serviceLayerRef.current = mergedLayer as Layer.Layer<ThreadService | ChatRuntime | HumeService, never, never>
    }

    // Sync state from ThreadService
    const syncState = useCallback(async () => {
        const program = Effect.gen(function* () {
            const threadService = yield* ThreadService
            return yield* threadService.getState()
        })

        try {
            const currentState = await Effect.runPromise(
                Effect.provide(program, serviceLayerRef.current!),
            )
            setState(currentState)
        } catch (err) {
            console.error('Failed to sync state:', err)
        }
    }, [])

    // Initialize services on mount
    useEffect(() => {
        syncState()
    }, [syncState])

    // Helper to send a message to ThreadService
    const sendToThreadService = useCallback(
        async (message: ThreadMessage) => {
            const program = Effect.gen(function* () {
                const threadService = yield* ThreadService
                yield* threadService.send(message)
                return yield* threadService.getState()
            })

            try {
                const newState = await Effect.runPromise(
                    Effect.provide(program, serviceLayerRef.current!),
                )
                setState(newState)
            } catch (err) {
                console.error('Failed to send message to ThreadService:', err)
                throw err
            }
        },
        [],
    )

    const addMessage = useCallback(
        async (role: 'user' | 'assistant' | 'system', content: string) => {
            await sendToThreadService({
                type: 'ADD_MESSAGE',
                payload: { role, content },
            })
        },
        [sendToThreadService],
    )

    const clearMessages = useCallback(async () => {
        await sendToThreadService({ type: 'CLEAR_MESSAGES' })
    }, [sendToThreadService])

    const retryLastMessage = useCallback(async () => {
        await sendToThreadService({ type: 'RETRY_LAST_MESSAGE' })
    }, [sendToThreadService])

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim()) return

            try {
                // Set loading state
                await sendToThreadService({ type: 'SET_LOADING', payload: true })
                await sendToThreadService({ type: 'SET_ERROR', payload: null })

                // Add user message and get the updated state in one operation
                // This ensures we're working with the same service instance
                const addMessageAndGetState = Effect.gen(function* () {
                    const threadService = yield* ThreadService
                    const runtime = yield* ChatRuntime
                    
                    // Add the user message
                    yield* threadService.send({
                        type: 'ADD_MESSAGE',
                        payload: { role: 'user', content },
                    })
                    
                    // Get the updated state immediately
                    const currentState = yield* threadService.getState()
                    
                    return {
                        messages: currentState.messages,
                        streamResponse: runtime.streamResponse,
                    }
                })

                const { messages: currentMessages, streamResponse } = await Effect.runPromise(
                    addMessageAndGetState.pipe(Effect.provide(serviceLayerRef.current!)),
                ).catch((err) => {
                    // If ChatRuntime fails to initialize (no API key), provide a clearer error
                    if (err instanceof Error && err.message.includes('API key')) {
                        throw new Error(
                            'No API key configured. Please set VITE_OPENAI_API_KEY or VITE_ANTHROPIC_API_KEY in your .env.local file and restart the dev server.',
                        )
                    }
                    throw err
                })

                // Update React state to reflect the user message
                setState((prev) => ({
                    ...prev,
                    messages: currentMessages,
                    lastUpdated: Date.now(),
                }))

                // Validate that we have messages before streaming
                if (!currentMessages || currentMessages.length === 0) {
                    console.error('No messages found after adding user message. Messages:', currentMessages)
                    throw new Error('No messages available to send. The user message may not have been saved properly.')
                }

                // Create initial assistant message with empty content
                let assistantMessageId: string | null = null
                let accumulatedContent = ''

                // Start streaming
                console.log('Starting stream with messages:', currentMessages)
                const streamIterable = streamResponse(currentMessages)

                // Process stream chunks incrementally
                let chunkCount = 0
                try {
                    for await (const chunk of streamIterable) {
                        chunkCount++
                        accumulatedContent += chunk
                        console.log(`Received chunk ${chunkCount}:`, chunk.substring(0, 50))

                        // For streaming updates, we update React state directly for performance
                        // This is a compromise since ThreadActor doesn't have UPDATE_MESSAGE action
                        // We'll sync back to ThreadService at the end
                        setState((prev) => {
                            const lastMessage = prev.messages[prev.messages.length - 1]
                            
                            // If last message is assistant, update it; otherwise add new one
                            if (lastMessage?.role === 'assistant' && assistantMessageId === lastMessage.id) {
                                return {
                                    ...prev,
                                    messages: [
                                        ...prev.messages.slice(0, -1),
                                        {
                                            ...lastMessage,
                                            content: accumulatedContent,
                                        },
                                    ],
                                    lastUpdated: Date.now(),
                                }
                            } else {
                                // Create new assistant message
                                const newMessage: Message = {
                                    id: assistantMessageId || crypto.randomUUID(),
                                    role: 'assistant',
                                    content: accumulatedContent,
                                    timestamp: Date.now(),
                                }
                                assistantMessageId = newMessage.id
                                return {
                                    ...prev,
                                    messages: [...prev.messages, newMessage],
                                    lastUpdated: Date.now(),
                                }
                            }
                        })
                    }
                    console.log(`Stream completed. Total chunks: ${chunkCount}, Content length: ${accumulatedContent.length}`)
                } catch (streamError) {
                    console.error('Error during streaming:', streamError)
                    throw streamError
                }

                // After streaming completes, ensure the final message is in ThreadService
                // Remove any partial assistant message and add the final one
                const finalState = await Effect.runPromise(
                    Effect.gen(function* () {
                        const threadService = yield* ThreadService
                        return yield* threadService.getState()
                    }).pipe(Effect.provide(serviceLayerRef.current!)),
                )

                // If the last message in ThreadService is different from our streamed content, update it
                const lastThreadMessage = finalState.messages[finalState.messages.length - 1]
                if (
                    lastThreadMessage?.role === 'assistant' &&
                    lastThreadMessage.content !== accumulatedContent
                ) {
                    // Remove last message and add updated one
                    await sendToThreadService({ type: 'RETRY_LAST_MESSAGE' })
                    await addMessage('assistant', accumulatedContent)
                } else if (lastThreadMessage?.role !== 'assistant') {
                    // No assistant message in ThreadService, add it
                    await addMessage('assistant', accumulatedContent)
                }

                // Final sync with ThreadService to ensure consistency
                await syncState()
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
                console.error('Error in sendMessage:', err)
                console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
                
                // Ensure error is set in state
                await sendToThreadService({ type: 'SET_ERROR', payload: errorMessage })
                
                // Also update React state directly to ensure error is visible
                setState((prev) => ({
                    ...prev,
                    error: errorMessage,
                    isLoading: false,
                }))
            } finally {
                // Always clear loading state
                await sendToThreadService({ type: 'SET_LOADING', payload: false })
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                }))
            }
        },
        [addMessage, sendToThreadService, syncState],
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

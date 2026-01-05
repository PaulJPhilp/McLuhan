import { FC, useEffect, useRef, useState } from 'react'
import { useChatContext } from '../context/ChatContext'
import { MessageComponent } from './Message'

/**
 * ChatThread component (like assistant-ui's Thread)
 * Displays the message history
 */
export const ChatThread: FC = () => {
    const { messages, isLoading, error } = useChatContext()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [autoScroll, setAutoScroll] = useState(true)

    const scrollToBottom = () => {
        if (autoScroll && messagesEndRef.current?.scrollIntoView) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, autoScroll])

    return (
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
            {messages.length === 0 && !isLoading ? (
                <div className="h-full flex items-center justify-center text-center text-gray-400">
                    <div>
                        <h2 className="text-lg font-semibold mb-2">Start a conversation</h2>
                        <p>Type a message below to begin.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {messages.map((message) => (
                        <MessageComponent key={message.id} message={message} />
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg my-4">
                            <p className="font-semibold mb-1">⚠️ Error</p>
                            <p className="text-sm">{error}</p>
                            {error.includes('API key') && (
                                <p className="text-xs mt-2 text-red-600">
                                    Tip: Create a <code className="bg-red-100 px-1 rounded">.env.local</code> file in the <code className="bg-red-100 px-1 rounded">apps/chat</code> directory with your API key.
                                </p>
                            )}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            )}

            {messages.length > 0 && (
                <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className="mt-4 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-400"
                >
                    {autoScroll ? '📌 Auto-scroll' : '📍 Manual scroll'}
                </button>
            )}
        </div>
    )
}

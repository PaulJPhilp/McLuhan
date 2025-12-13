import { useEffect, useState } from 'react'
import { ChatThread } from './components/ChatThread'
import { Composer } from './components/Composer'
import { ChatProvider } from './context/ChatContext'

export default function App() {
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        // Initialize application
        setIsLoaded(true)
    }, [])

    if (!isLoaded) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Chat UI</h1>
                    <p className="text-gray-600">Initializing...</p>
                </div>
            </div>
        )
    }

    return (
        <ChatProvider>
            <div className="w-full h-screen flex flex-col bg-white">
                <header className="border-b border-chat-border px-6 py-4">
                    <h1 className="text-xl font-bold text-gray-900">Chat - Powered by Effect</h1>
                    <p className="text-sm text-gray-500">Using effect-ai-sdk, effect-actor, effect-supermemory, and Hume AI</p>
                </header>

                <main className="flex-1 overflow-hidden flex flex-col">
                    <ChatThread />
                    <Composer />
                </main>
            </div>
        </ChatProvider>
    )
}
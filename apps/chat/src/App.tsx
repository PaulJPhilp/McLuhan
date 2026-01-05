import { Schema } from 'effect'
import { useEffect, useState } from 'react'
import { ChatThread } from './components/ChatThread'
import { Composer } from './components/Composer'
import { ChatProvider } from './context/ChatContext'

/**
 * Environment schema for API key checking
 */
const ApiKeyEnvSchema = Schema.Struct({
  VITE_OPENAI_API_KEY: Schema.optional(Schema.String),
  VITE_ANTHROPIC_API_KEY: Schema.optional(Schema.String),
})

/**
 * Get environment values from Vite's import.meta.env
 * Returns parsed values directly to avoid Effect TypeId mismatch between monorepos
 */
function getViteEnvValues(): Schema.Schema.Type<typeof ApiKeyEnvSchema> {
  const viteEnv: Record<string, string | undefined> = {}
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    for (const key in import.meta.env) {
      viteEnv[key] = import.meta.env[key] as string | undefined
    }
  }
  
  // Parse schema synchronously (skipValidation=true means we can use empty object on error)
  try {
    return Schema.decodeUnknownSync(ApiKeyEnvSchema)(viteEnv)
  } catch {
    return {} as Schema.Schema.Type<typeof ApiKeyEnvSchema>
  }
}

/**
 * Check if API keys are available
 * Accesses parsed values directly to avoid Effect TypeId mismatch
 */
async function hasApiKey(): Promise<boolean> {
  try {
    const envValues = getViteEnvValues()
    const openaiKey = envValues.VITE_OPENAI_API_KEY
    const anthropicKey = envValues.VITE_ANTHROPIC_API_KEY
    return !!(openaiKey || anthropicKey)
  } catch {
    return false
  }
}

export default function App() {
    const [isLoaded, setIsLoaded] = useState(false)
    const [hasKey, setHasKey] = useState<boolean | null>(null)

    useEffect(() => {
        // Initialize application and check API keys
        const init = async () => {
            setIsLoaded(true)
            const keyExists = await hasApiKey()
            setHasKey(keyExists)
        }
        init()
    }, [])

    if (!isLoaded || hasKey === null) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Chat UI</h1>
                    <p className="text-gray-600">Initializing...</p>
                </div>
            </div>
        )
    }

    if (!hasKey) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md mx-auto p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h2 className="text-xl font-bold text-yellow-900 mb-2">⚠️ API Key Required</h2>
                    <p className="text-yellow-800 mb-4">
                        To use the chat app, you need to configure an API key.
                    </p>
                    <div className="bg-white p-4 rounded border border-yellow-200 mb-4">
                        <p className="text-sm font-semibold mb-2">Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in <code className="bg-gray-100 px-1 rounded">apps/chat/</code>:</p>
                        <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`VITE_OPENAI_API_KEY=sk-your-key-here
# OR
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here`}
                        </pre>
                    </div>
                    <p className="text-sm text-yellow-700">
                        After adding the file, restart the dev server for changes to take effect.
                    </p>
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
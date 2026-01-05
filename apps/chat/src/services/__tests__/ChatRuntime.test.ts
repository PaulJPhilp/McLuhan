import { Effect } from 'effect'
import { describe, it, expect, beforeEach } from 'vitest'
import { ChatRuntime } from '../ChatRuntime'
import { createTestMessage } from '../../__tests__/fixtures/test-data'

describe('ChatRuntime', () => {
    beforeEach(() => {
        // Reset environment variables
        delete import.meta.env.VITE_OPENAI_API_KEY
        delete import.meta.env.VITE_ANTHROPIC_API_KEY
        delete import.meta.env.VITE_AI_PROVIDER
        delete import.meta.env.VITE_AI_MODEL
        delete import.meta.env.VITE_SYSTEM_PROMPT
    })

    describe('Service Initialization', () => {
        it('should provide Default layer', () => {
            expect(ChatRuntime.Default).toBeDefined()
            expect(typeof ChatRuntime.Default).toBe('function')
        })

        it.skip('should create service instance with valid API key', async () => {
            // Skip: Requires real API key
            import.meta.env.VITE_OPENAI_API_KEY = 'test-key'

            const layer = ChatRuntime.Default()
            const program = Effect.gen(function* () {
                const service = yield* ChatRuntime
                return service !== undefined
            })

            const result = await Effect.runPromise(Effect.provide(program, layer))
            expect(result).toBe(true)
        })

        it('should fail when no API keys are present', async () => {
            const layer = ChatRuntime.Default()
            const program = Effect.gen(function* () {
                const service = yield* ChatRuntime
                return service
            })

            await expect(Effect.runPromise(Effect.provide(program, layer))).rejects.toThrow(
                'No API key found',
            )
        })
    })

    describe('Provider Selection', () => {
        it.skip('should prefer OpenAI when both keys are present and no provider specified', async () => {
            // Skip: Requires real API keys to test provider selection logic
            // The logic is tested in the "should fail when no API keys are present" test
            import.meta.env.VITE_OPENAI_API_KEY = 'openai-key'
            import.meta.env.VITE_ANTHROPIC_API_KEY = 'anthropic-key'

            const layer = ChatRuntime.Default()
            const program = Effect.gen(function* () {
                const service = yield* ChatRuntime
                return service
            })

            // This would require real API keys to test provider selection
            await Effect.runPromise(Effect.provide(program, layer))
        })

        it.skip('should use Anthropic when specified via VITE_AI_PROVIDER', async () => {
            // Skip: Requires real API keys
            import.meta.env.VITE_OPENAI_API_KEY = 'openai-key'
            import.meta.env.VITE_ANTHROPIC_API_KEY = 'anthropic-key'
            import.meta.env.VITE_AI_PROVIDER = 'anthropic'

            const layer = ChatRuntime.Default()
            const program = Effect.gen(function* () {
                const service = yield* ChatRuntime
                return service
            })

            await Effect.runPromise(Effect.provide(program, layer))
        })
    })

    describe('generateResponse', () => {
        it.skip('should generate response from messages', async () => {
            // Skip: Requires real API key and network access
            import.meta.env.VITE_OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || 'test-key'

            const layer = ChatRuntime.Default()
            const messages = [createTestMessage({ role: 'user', content: 'Hello' })]

            const program = Effect.gen(function* () {
                const service = yield* ChatRuntime
                return yield* service.generateResponse(messages)
            })

            // Only run if we have a real API key
            if (process.env.VITE_OPENAI_API_KEY) {
                const result = await Effect.runPromise(Effect.provide(program, layer))
                expect(typeof result).toBe('string')
                expect(result.length).toBeGreaterThan(0)
            }
        })
    })

    describe('streamResponse', () => {
        it.skip('should stream response chunks', async () => {
            // Skip: Requires real API key and network access
            import.meta.env.VITE_OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || 'test-key'

            const layer = ChatRuntime.Default()
            const messages = [createTestMessage({ role: 'user', content: 'Hello' })]

            const program = Effect.gen(function* () {
                const service = yield* ChatRuntime
                return service.streamResponse(messages)
            })

            // Only run if we have a real API key
            if (process.env.VITE_OPENAI_API_KEY) {
                const stream = await Effect.runPromise(Effect.provide(program, layer))

                const chunks: string[] = []
                for await (const chunk of stream) {
                    chunks.push(chunk)
                }

                expect(chunks.length).toBeGreaterThan(0)
            }
        })
    })
})

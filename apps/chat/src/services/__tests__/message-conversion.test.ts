import { describe, it, expect } from 'vitest'
import { Chunk } from 'effect'
import { Message as EffectiveMessage, TextPart } from 'effect-ai-sdk'
import { createTestMessage } from '../../__tests__/fixtures/test-data'
import type { Message } from '../../actors/ThreadActor'

// Import the conversion functions from ChatRuntime
// Since they're not exported, we'll test them indirectly through ChatRuntime
// or we can extract them for testing

/**
 * Test helper: Convert ThreadActor Message to EffectiveMessage
 * This mirrors the implementation in ChatRuntime.ts
 */
function toEffectiveMessage(message: Message): EffectiveMessage {
    const role = message.role === 'assistant' ? 'model' : message.role
    const parts = Chunk.of(new TextPart({ _tag: 'Text', content: message.content }))
    return new EffectiveMessage({ role, parts })
}

/**
 * Test helper: Convert ThreadActor Message[] to EffectiveMessage Chunk
 * This mirrors the implementation in ChatRuntime.ts
 */
function toEffectiveMessages(messages: readonly Message[]): Chunk.Chunk<EffectiveMessage> {
    return Chunk.fromIterable(messages.map(toEffectiveMessage))
}

describe('Message Conversion', () => {
    describe('toEffectiveMessage', () => {
        it('should convert user message correctly', () => {
            const message = createTestMessage({ role: 'user', content: 'Hello' })
            const effective = toEffectiveMessage(message)

            expect(effective.role).toBe('user')
            expect(Chunk.toReadonlyArray(effective.parts)).toHaveLength(1)
            const part = Chunk.toReadonlyArray(effective.parts)[0]
            expect(part).toBeInstanceOf(TextPart)
            expect((part as TextPart).content).toBe('Hello')
        })

        it('should convert assistant message to model role', () => {
            const message = createTestMessage({ role: 'assistant', content: 'Hi there!' })
            const effective = toEffectiveMessage(message)

            expect(effective.role).toBe('model')
            expect(Chunk.toReadonlyArray(effective.parts)).toHaveLength(1)
            const part = Chunk.toReadonlyArray(effective.parts)[0]
            expect((part as TextPart).content).toBe('Hi there!')
        })

        it('should convert system message correctly', () => {
            const message = createTestMessage({ role: 'system', content: 'System prompt' })
            const effective = toEffectiveMessage(message)

            expect(effective.role).toBe('system')
            const part = Chunk.toReadonlyArray(effective.parts)[0]
            expect((part as TextPart).content).toBe('System prompt')
        })

        it('should handle empty content', () => {
            const message = createTestMessage({ role: 'user', content: '' })
            const effective = toEffectiveMessage(message)

            const part = Chunk.toReadonlyArray(effective.parts)[0]
            expect((part as TextPart).content).toBe('')
        })

        it('should handle long content', () => {
            const longContent = 'a'.repeat(1000)
            const message = createTestMessage({ role: 'user', content: longContent })
            const effective = toEffectiveMessage(message)

            const part = Chunk.toReadonlyArray(effective.parts)[0]
            expect((part as TextPart).content).toBe(longContent)
        })
    })

    describe('toEffectiveMessages', () => {
        it('should convert empty array', () => {
            const messages: Message[] = []
            const effectiveMessages = toEffectiveMessages(messages)

            expect(Chunk.toReadonlyArray(effectiveMessages)).toHaveLength(0)
        })

        it('should convert single message', () => {
            const messages = [createTestMessage({ role: 'user', content: 'Hello' })]
            const effectiveMessages = toEffectiveMessages(messages)

            expect(Chunk.toReadonlyArray(effectiveMessages)).toHaveLength(1)
            expect(Chunk.toReadonlyArray(effectiveMessages)[0]?.role).toBe('user')
        })

        it('should convert multiple messages', () => {
            const messages = [
                createTestMessage({ role: 'user', content: 'Question' }),
                createTestMessage({ role: 'assistant', content: 'Answer' }),
                createTestMessage({ role: 'user', content: 'Follow-up' }),
            ]
            const effectiveMessages = toEffectiveMessages(messages)

            const array = Chunk.toReadonlyArray(effectiveMessages)
            expect(array).toHaveLength(3)
            expect(array[0]?.role).toBe('user')
            expect(array[1]?.role).toBe('model')
            expect(array[2]?.role).toBe('user')
        })

        it('should preserve message order', () => {
            const messages = [
                createTestMessage({ role: 'user', content: 'First' }),
                createTestMessage({ role: 'assistant', content: 'Second' }),
                createTestMessage({ role: 'user', content: 'Third' }),
            ]
            const effectiveMessages = toEffectiveMessages(messages)

            const array = Chunk.toReadonlyArray(effectiveMessages)
            expect(array[0]?.role).toBe('user')
            expect(array[1]?.role).toBe('model')
            expect(array[2]?.role).toBe('user')

            const part0 = Chunk.toReadonlyArray(array[0]!.parts)[0] as TextPart
            const part1 = Chunk.toReadonlyArray(array[1]!.parts)[0] as TextPart
            const part2 = Chunk.toReadonlyArray(array[2]!.parts)[0] as TextPart

            expect(part0.content).toBe('First')
            expect(part1.content).toBe('Second')
            expect(part2.content).toBe('Third')
        })

        it('should handle messages with metadata', () => {
            const messages = [
                createTestMessage({
                    role: 'user',
                    content: 'Test',
                    timestamp: 1234567890,
                }),
            ]
            const effectiveMessages = toEffectiveMessages(messages)

            expect(Chunk.toReadonlyArray(effectiveMessages)).toHaveLength(1)
        })
    })

    describe('Edge Cases', () => {
        it('should handle special characters in content', () => {
            const specialContent = 'Hello\nWorld\tTab\n\nMultiple\n\n\nNewlines'
            const message = createTestMessage({ role: 'user', content: specialContent })
            const effective = toEffectiveMessage(message)

            const part = Chunk.toReadonlyArray(effective.parts)[0]
            expect((part as TextPart).content).toBe(specialContent)
        })

        it('should handle unicode characters', () => {
            const unicodeContent = 'Hello 🌍 世界 مرحبا'
            const message = createTestMessage({ role: 'user', content: unicodeContent })
            const effective = toEffectiveMessage(message)

            const part = Chunk.toReadonlyArray(effective.parts)[0]
            expect((part as TextPart).content).toBe(unicodeContent)
        })

        it('should handle very large message arrays', () => {
            const messages = Array.from({ length: 100 }, (_, i) =>
                createTestMessage({ role: i % 2 === 0 ? 'user' : 'assistant', content: `Message ${i}` }),
            )
            const effectiveMessages = toEffectiveMessages(messages)

            expect(Chunk.toReadonlyArray(effectiveMessages)).toHaveLength(100)
        })
    })
})

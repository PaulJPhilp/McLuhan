import { Effect } from 'effect'

/**
 * Configuration for Hume EVI (Empathic Voice Interface)
 */
export interface HumeConfig {
    apiKey?: string
    enableVoice?: boolean
    enableEmotionDetection?: boolean
}

/**
 * Voice state for Hume EVI
 */
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

/**
 * Emotion data from Hume
 */
export interface EmotionData {
    name: string
    score: number
}

/**
 * HumeService - provides voice and emotion detection
 */
export class HumeService extends Effect.Service<HumeService>()(
    'chat/HumeService',
    {
        sync: () => ({
            startVoiceSession: () =>
                Effect.sync(() => crypto.randomUUID()),
            endVoiceSession: (sessionId: string) =>
                Effect.sync(() => {
                    // Cleanup voice session
                }),
            getVoiceState: (sessionId: string) =>
                Effect.sync(() => 'idle' as VoiceState),
            getDetectedEmotions: (sessionId: string) =>
                Effect.sync(() => [] as EmotionData[]),
        }),
    }
) { }

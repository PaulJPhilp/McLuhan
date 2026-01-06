import type { Effect } from "effect";
import type { EmotionData, VoiceState } from "./types.js";

/**
 * HumeService API interface
 */
export interface HumeServiceApi {
	readonly startVoiceSession: () => Effect.Effect<string>;
	readonly endVoiceSession: (sessionId: string) => Effect.Effect<void>;
	readonly getVoiceState: (sessionId: string) => Effect.Effect<VoiceState>;
	readonly getDetectedEmotions: (
		sessionId: string,
	) => Effect.Effect<readonly EmotionData[]>;
}

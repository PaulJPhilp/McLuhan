import { Effect } from "effect";
import type { HumeServiceApi } from "./api.js";
import type { EmotionData, VoiceState } from "./types.js";

/**
 * HumeService - provides voice and emotion detection
 */
export class HumeService extends Effect.Service<HumeService>()(
	"chat/HumeService",
	{
		effect: Effect.fn(function* () {
			return {
				startVoiceSession: () => Effect.sync(() => crypto.randomUUID()),
				endVoiceSession: (_sessionId: string) =>
					Effect.sync(() => {
						// Cleanup voice session
					}),
				getVoiceState: (_sessionId: string) =>
					Effect.sync(() => "idle" as VoiceState),
				getDetectedEmotions: (_sessionId: string) =>
					Effect.sync(() => [] as readonly EmotionData[]),
			} satisfies HumeServiceApi;
		}),
	},
) {}

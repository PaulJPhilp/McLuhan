/**
 * Configuration for Hume EVI (Empathic Voice Interface)
 */
export interface HumeConfig {
	apiKey?: string;
	enableVoice?: boolean;
	enableEmotionDetection?: boolean;
}

/**
 * Voice state for Hume EVI
 */
export type VoiceState = "idle" | "listening" | "processing" | "speaking";

/**
 * Emotion data from Hume
 */
export interface EmotionData {
	name: string;
	score: number;
}

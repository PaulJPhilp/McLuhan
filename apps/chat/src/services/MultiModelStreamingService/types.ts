/**
 * Multi-model streaming types
 */

import type { Message } from "../../actors/ThreadActor.js";

export interface ModelStreamMetrics {
	readonly timeToFirstTokenMs: number | null; // null if no tokens received
	readonly totalDurationMs: number;
	readonly outputTokens: number;
}

export interface ModelStreamResult {
	readonly modelId: string;
	readonly provider: string;
	readonly content: string;
	readonly success: boolean;
	readonly error?: string;
	readonly durationMs: number;
	readonly chunkCount: number;
	readonly metrics: ModelStreamMetrics;
}

export interface MultiModelStreamOptions {
	readonly messages: readonly Message[];
	readonly modelConfigs: readonly ModelConfig[];
	readonly onModelStart?: (modelId: string, provider: string) => void;
	readonly onChunk?: (
		modelId: string,
		chunk: string,
		accumulated: string,
	) => void;
	readonly onModelComplete?: (result: ModelStreamResult) => void;
	readonly onError?: (modelId: string, error: Error) => void;
	readonly timeoutMs?: number;
}

export interface ModelConfig {
	readonly modelId: string;
	readonly provider: string;
}

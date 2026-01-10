import type { Message } from "../../actors/ThreadActor.js";

/**
 * Callback for receiving stream chunks
 */
export type OnChunkCallback = (chunk: string, accumulated: string) => void;

/**
 * Callback for stream completion
 */
export type OnCompleteCallback = (finalContent: string) => void;

/**
 * Callback for stream errors
 */
export type OnErrorCallback = (error: Error) => void;

/**
 * Stream state during execution
 */
export interface StreamState {
	readonly isStreaming: boolean;
	readonly chunkCount: number;
	readonly accumulatedContent: string;
	readonly startTime: number;
	readonly error?: Error;
}

/**
 * Options for streaming a chat response
 */
export interface StreamChatOptions {
	readonly messages: readonly Message[];
	readonly messageId?: string;
	readonly modelProvider?: string;
	readonly modelId?: string;
	readonly onChunk?: OnChunkCallback;
	readonly onComplete?: OnCompleteCallback;
	readonly onError?: OnErrorCallback;
	readonly timeoutMs?: number;
}

/**
 * Result from a completed stream
 */
export interface StreamResult {
	readonly content: string;
	readonly chunkCount: number;
	readonly durationMs: number;
}

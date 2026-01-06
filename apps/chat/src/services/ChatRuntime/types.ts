/**
 * Configuration for ChatRuntime
 */
export interface ChatRuntimeConfig {
	provider?: "openai" | "anthropic";
	model?: string;
	systemPrompt?: string;
}

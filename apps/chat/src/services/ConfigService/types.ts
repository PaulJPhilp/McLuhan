import { Schema } from "effect";

/**
 * Supported AI providers
 */
export type AIProvider = "openai" | "anthropic";

/**
 * Schema for chat app environment configuration
 */
export const ChatEnvSchema = Schema.Struct({
	VITE_OPENAI_API_KEY: Schema.optional(Schema.String),
	VITE_ANTHROPIC_API_KEY: Schema.optional(Schema.String),
	VITE_AI_PROVIDER: Schema.optional(Schema.String),
	VITE_AI_MODEL: Schema.optional(Schema.String),
	VITE_SYSTEM_PROMPT: Schema.optional(Schema.String),
});

/**
 * Type for parsed environment values
 */
export type ChatEnvValues = Schema.Schema.Type<typeof ChatEnvSchema>;

/**
 * Configuration for the AI provider
 */
export interface AIProviderConfig {
	readonly provider: AIProvider;
	readonly apiKey: string;
	readonly model: string;
	readonly systemPrompt?: string;
}

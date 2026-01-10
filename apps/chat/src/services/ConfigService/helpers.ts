import { Schema } from "effect";
import type { ChatEnvValues } from "./types.js";
import { ChatEnvSchema } from "./types.js";

/**
 * Get environment values from Vite's import.meta.env
 * Returns parsed values directly to avoid Effect TypeId mismatch between monorepos
 */
export function getViteEnvValues(): ChatEnvValues {
	const viteEnv: Record<string, string | undefined> = {};
	if (typeof import.meta !== "undefined" && import.meta.env) {
		for (const key in import.meta.env) {
			viteEnv[key] = import.meta.env[key] as string | undefined;
		}
	}

	// Parse schema synchronously
	try {
		return Schema.decodeUnknownSync(ChatEnvSchema)(viteEnv);
	} catch {
		return {} as ChatEnvValues;
	}
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: "openai" | "anthropic"): string {
	return provider === "openai" ? "gpt-4o" : "claude-3-5-sonnet-20241022";
}

/**
 * Mask an API key for logging (shows first 4 and last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
	if (apiKey.length <= 8) {
		return "***";
	}
	return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

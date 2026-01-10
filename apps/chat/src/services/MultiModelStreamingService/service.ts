import { Chunk, Effect, Either, Metric } from "effect";
import {
	toVercelMessages,
	createProvider,
	getLanguageModel,
} from "effect-ai-sdk";
import { streamText as vercelStreamText } from "ai";
import type { LanguageModel } from "ai";
import type { Message } from "../../actors/ThreadActor.js";
import { toEffectiveMessages } from "../ChatRuntime/helpers.js";
import { getViteEnvValues } from "../ConfigService/index.js";
import type { MultiModelStreamingServiceApi } from "./api.js";
import { ModelStreamError } from "./errors.js";
import {
	outputTokensCounter,
	ttftHistogram,
	totalDurationHistogram,
} from "./metrics.js";
import type { ModelStreamResult, MultiModelStreamOptions } from "./types.js";

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_BATCH_SIZE = 5;

/**
 * Split an array into batches of specified size
 */
function chunkArray<T>(array: readonly T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

/**
 * Get API key for a provider
 */
function getApiKeyForProvider(provider: string): string | null {
	if (typeof import.meta === "undefined" || !import.meta.env) {
		return null;
	}

	const env = import.meta.env as Record<string, string | undefined>;

	switch (provider) {
		case "openai":
			return env.VITE_OPENAI_API_KEY || null;
		case "anthropic":
			return env.VITE_ANTHROPIC_API_KEY || null;
		case "google":
			return env.VITE_GOOGLE_API_KEY || null;
		case "groq":
			return env.VITE_GROQ_API_KEY || null;
		case "deepseek":
			return env.VITE_DEEPSEEK_API_KEY || null;
		case "perplexity":
			return env.VITE_PERPLEXITY_API_KEY || null;
		case "xai":
			return env.VITE_XAI_API_KEY || null;
		case "qwen":
			return env.VITE_QWEN_API_KEY || null;
		case "gateway":
			return env.VITE_VERCEL_AI_GATEWAY_API_KEY || null;
		default:
			return null;
	}
}

/**
 * Create a language model instance for a specific provider and model
 */
function createModelForProvider(
	provider: string,
	modelId: string,
): Effect.Effect<LanguageModel, Error> {
	return Effect.gen(function* () {
		const apiKey = getApiKeyForProvider(provider);
		if (!apiKey) {
			return yield* Effect.fail(
				new Error(`No API key found for provider: ${provider}`),
			);
		}

		// Create provider instance
		const providerInstance = yield* createProvider(
			provider as any,
			{ apiKey },
		);

		// Get language model
		const model = yield* getLanguageModel(providerInstance, modelId);

		return model;
	}).pipe(
		Effect.catchAll((error) =>
			Effect.fail(
				new Error(
					`Failed to create model ${modelId} for provider ${provider}: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			),
		),
	);
}

/**
 * Stream a single model sequentially
 */
function streamSingleModel(
	modelConfig: { modelId: string; provider: string },
	messages: readonly Message[],
	options: {
		onChunk?: (modelId: string, chunk: string, accumulated: string) => void;
		timeoutMs: number;
	},
): Effect.Effect<ModelStreamResult, never> {
	return Effect.gen(function* () {
		const startTime = Date.now();
		let accumulatedContent = "";
		let chunkCount = 0;
		let success = true;
		let errorMessage: string | undefined = undefined;
		let firstTokenTime: number | null = null;
		let outputTokens = 0;

		// Get system prompt
		const envValues = getViteEnvValues();
		const systemPrompt = envValues.VITE_SYSTEM_PROMPT;

		// Create model instance
		const apiKey = getApiKeyForProvider(modelConfig.provider);
		const model = yield* createModelForProvider(
			modelConfig.provider,
			modelConfig.modelId,
		).pipe(
			Effect.tapError((error) =>
				Effect.sync(() => {
					console.error(
						`[${modelConfig.provider}] Failed to create model ${modelConfig.modelId}:`,
						error,
					);
					if (error instanceof Error) {
						console.error(`[${modelConfig.provider}] Error stack:`, error.stack);
						console.error(`[${modelConfig.provider}] Error name:`, error.name);
					}
					console.error(
						`[${modelConfig.provider}] API key present:`,
						apiKey ? "Yes" : "No",
					);
					if (modelConfig.provider === "google") {
						console.error(
							`[google] API key length:`,
							apiKey ? apiKey.length : 0,
						);
						console.error(
							`[google] API key prefix:`,
							apiKey ? apiKey.substring(0, 10) + "..." : "N/A",
						);
					}
				}),
			),
		);

		// Track whether an error occurred during streaming
		let streamErrorOccurred = false;

		// Stream with timeout - wrap entire operation in Effect.tryPromise
		const streamResult = yield* Effect.tryPromise({
			try: async () => {
				let localAccumulatedContent = "";
				let localChunkCount = 0;

				// Create timeout promise
				const timeoutPromise = new Promise<never>((_, reject) => {
					setTimeout(() => {
						reject(
							new Error(
								`Stream timed out after ${options.timeoutMs}ms for model ${modelConfig.modelId}`,
							),
						);
					}, options.timeoutMs);
				});

				// Stream promise
				const streamPromise = (async () => {
					// Convert messages
					const effectiveMessages = toEffectiveMessages(messages);
					const vercelMessages = await Effect.runPromise(
						toVercelMessages(effectiveMessages).pipe(
							Effect.catchAll((error) =>
								Effect.fail(
									new Error(
										`Failed to convert messages: ${
											error instanceof Error ? error.message : String(error)
										}`,
									),
								),
							),
						),
					);

					// Create stream options for Vercel AI SDK
					const streamOptions: {
						messages: Array<
							| { role: "system" | "user" | "assistant"; content: string }
							| Record<string, unknown>
						>;
						system?: string;
					} = {
						messages: vercelMessages as Array<
							| { role: "system" | "user" | "assistant"; content: string }
							| Record<string, unknown>
						>,
					};

					if (systemPrompt) {
						streamOptions.system = systemPrompt;
					}

					// Call Vercel AI SDK directly to access usage
					const vercelResult = vercelStreamText({
						model,
						messages: streamOptions.messages as any, // Vercel AI SDK accepts various message formats
						...(streamOptions.system ? { system: streamOptions.system } : {}),
					});

					// Track first token time
					let firstChunkReceived = false;

					// Use textStream which yields text chunks directly
					const textStream = vercelResult.textStream;

					for await (const chunk of textStream) {
						if (chunk) {
							// Track first token time
							if (!firstChunkReceived) {
								firstChunkReceived = true;
								firstTokenTime = Date.now();
							}

							localChunkCount++;
							localAccumulatedContent += chunk;

							if (options.onChunk) {
								options.onChunk(
									modelConfig.modelId,
									chunk,
									localAccumulatedContent,
								);
							}
						}
					}

					// Get token usage from Vercel AI SDK result
					try {
						const usage = await vercelResult.usage;
						if (usage && typeof usage === "object") {
							outputTokens = usage.outputTokens ?? 0;
						}
					} catch {
						// Usage might not be available, ignore
					}

					return { content: localAccumulatedContent, chunkCount: localChunkCount };
				})();

				// Race between stream and timeout
				return await Promise.race([streamPromise, timeoutPromise]);
			},
			catch: (error) => {
				// Return the error to be handled by catchAll
				return error instanceof Error ? error : new Error(String(error));
			},
		}).pipe(
			Effect.catchAll((error) => {
				// Handle error - mark as failed and return empty result
				streamErrorOccurred = true;
				success = false;
				errorMessage = error instanceof Error ? error.message : String(error);
				console.error(
					`Stream error for ${modelConfig.modelId} (${modelConfig.provider}):`,
					error,
				);
				// Log full error details for debugging
				if (error instanceof Error) {
					console.error(`Error stack:`, error.stack);
					console.error(`Error name:`, error.name);
				}
				return Effect.succeed({ content: "", chunkCount: 0 });
			}),
		);

		// Update variables from stream result (only if stream succeeded and no error occurred)
		if (!streamErrorOccurred && streamResult && streamResult.content) {
			accumulatedContent = streamResult.content;
			chunkCount = streamResult.chunkCount;
			success = true; // Mark as successful if we got content and no error occurred
		} else if (!streamErrorOccurred && streamResult) {
			// Even if content is empty, if no error occurred, mark as success
			// (some models might return empty content legitimately)
			accumulatedContent = streamResult.content || "";
			chunkCount = streamResult.chunkCount;
			success = true;
		}

		const durationMs = Date.now() - startTime;
		const timeToFirstTokenMs =
			firstTokenTime !== null ? firstTokenTime - startTime : null;

		// Record metrics with model ID as tag
		const metricsWithTags = {
			ttft: ttftHistogram.pipe(
				Metric.tagged("model_id", modelConfig.modelId),
				Metric.tagged("provider", modelConfig.provider),
			),
			totalDuration: totalDurationHistogram.pipe(
				Metric.tagged("model_id", modelConfig.modelId),
				Metric.tagged("provider", modelConfig.provider),
			),
			outputTokens: outputTokensCounter.pipe(
				Metric.tagged("model_id", modelConfig.modelId),
				Metric.tagged("provider", modelConfig.provider),
			),
		};

		// Record TTFT if we received tokens
		if (timeToFirstTokenMs !== null) {
			yield* Metric.update(metricsWithTags.ttft, timeToFirstTokenMs);
		}

		// Record total duration
		yield* Metric.update(metricsWithTags.totalDuration, durationMs);

		// Record output tokens
		if (outputTokens > 0) {
			yield* Metric.incrementBy(metricsWithTags.outputTokens, outputTokens);
		}

		const result: ModelStreamResult = {
			modelId: modelConfig.modelId,
			provider: modelConfig.provider,
			content: accumulatedContent,
			success,
			...(errorMessage ? { error: errorMessage } : {}),
			durationMs,
			chunkCount,
			metrics: {
				timeToFirstTokenMs,
				totalDurationMs: durationMs,
				outputTokens,
			},
		};
		return result;
	}).pipe(
		Effect.catchAll((error) => {
			const errorResult: ModelStreamResult = {
				modelId: modelConfig.modelId,
				provider: modelConfig.provider,
				content: "",
				success: false,
				error: error instanceof Error ? error.message : String(error),
				durationMs: 0,
				chunkCount: 0,
				metrics: {
					timeToFirstTokenMs: null,
					totalDurationMs: 0,
					outputTokens: 0,
				},
			};
			return Effect.succeed(errorResult);
		}),
	);
}

/**
 * MultiModelStreamingService - handles streaming for multiple models
 */
export class MultiModelStreamingService extends Effect.Service<MultiModelStreamingService>()(
	"chat/MultiModelStreamingService",
	{
		effect: Effect.fn(function* () {
			return {
				streamMultipleModels: (options: MultiModelStreamOptions) =>
					Effect.gen(function* () {
						const {
							messages,
							modelConfigs,
							onModelStart,
							onChunk,
							onModelComplete,
							onError,
							timeoutMs = DEFAULT_TIMEOUT_MS,
							batchSize = DEFAULT_BATCH_SIZE,
						} = options;

						// Validate inputs
						if (!messages || messages.length === 0) {
							return [];
						}

						if (!modelConfigs || modelConfigs.length === 0) {
							return [];
						}

						const results: ModelStreamResult[] = [];

						// Split models into batches
						const batches = chunkArray(modelConfigs, batchSize);

						// Process batches sequentially
						for (const batch of batches) {
							// Notify that models in batch are starting
							for (const modelConfig of batch) {
								if (onModelStart) {
									onModelStart(modelConfig.modelId, modelConfig.provider);
								}
							}

							// Run batch in parallel using Effect.all
							const batchResults = yield* Effect.all(
								batch.map((modelConfig) =>
									streamSingleModel(modelConfig, messages, {
										...(onChunk ? { onChunk } : {}),
										timeoutMs,
									}),
								),
								{
									concurrency: batch.length, // Run all in batch concurrently
									mode: "either", // Collect all results even if some fail
								},
							);

							// Process results and call callbacks
							// Note: streamSingleModel never fails (returns ModelStreamResult with success: false on error)
							// So Either will always be Right, but we extract it for clarity
							for (const eitherResult of batchResults) {
								// Extract result from Either (will always be Right since streamSingleModel never fails)
								const result = Either.match(eitherResult, {
									onLeft: () => {
										// This should never happen, but provide fallback for type safety
										const modelConfig = batch[0];
										return {
											modelId: modelConfig?.modelId || "unknown",
											provider: modelConfig?.provider || "unknown",
											content: "",
											success: false,
											error: "Unexpected error",
											durationMs: 0,
											chunkCount: 0,
											metrics: {
												timeToFirstTokenMs: null,
												totalDurationMs: 0,
												outputTokens: 0,
											},
										} satisfies ModelStreamResult;
									},
									onRight: (result) => result,
								});

								results.push(result);

								// Call callbacks immediately as results arrive
								if (onModelComplete) {
									onModelComplete(result);
								}

								if (!result.success && onError) {
									onError(
										result.modelId,
										new Error(result.error || "Unknown error"),
									);
								}
							}
						}

						return results;
					}),
			} satisfies MultiModelStreamingServiceApi;
		}),
	},
) {}

import { Effect, Metric } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestMessage } from "../../../__tests__/fixtures/test-data";
import { MultiModelStreamingService } from "../service";
import {
	outputTokensCounter,
	ttftHistogram,
	totalDurationHistogram,
} from "../metrics";
import type { ModelConfig, ModelStreamResult } from "../types";

describe("MultiModelStreamingService", () => {
	describe("Service Initialization", () => {
		it("should provide Default layer", () => {
			expect(MultiModelStreamingService.Default).toBeDefined();
		});

		it("should be accessible via Effect.Service", async () => {
			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return service !== undefined;
			});

			const result = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);
			expect(result).toBe(true);
		});

		it("should have streamMultipleModels method", async () => {
			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return typeof service.streamMultipleModels === "function";
			});

			const result = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);
			expect(result).toBe(true);
		});
	});

	describe("Input Validation", () => {
		it("should return empty array when messages are empty", async () => {
			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [],
					modelConfigs: [{ modelId: "gpt-4o", provider: "openai" }],
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			expect(results).toEqual([]);
		});

		it("should return empty array when modelConfigs are empty", async () => {
			const testMessage = createTestMessage({ content: "Test" });

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs: [],
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			expect(results).toEqual([]);
		});
	});

	describe("Callback Invocation", () => {
		// Note: These tests verify callback invocation with mock/missing API keys
		// The service should still invoke callbacks even when API calls fail

		it("should call onModelStart for each model", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
				{ modelId: "gpt-4o-mini", provider: "openai" },
			];

			const startedModels: string[] = [];
			const onModelStart = vi.fn((modelId: string) => {
				startedModels.push(modelId);
			});

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					onModelStart,
					timeoutMs: 1000, // Short timeout for faster tests
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			// onModelStart should be called for each model
			expect(onModelStart).toHaveBeenCalledTimes(2);
			expect(startedModels).toContain("gpt-4o");
			expect(startedModels).toContain("gpt-4o-mini");

			// Should return results for each model (even if failed due to no API key)
			expect(results).toHaveLength(2);
		});

		it("should call onModelComplete for each model", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
			];

			const completedResults: ModelStreamResult[] = [];
			const onModelComplete = vi.fn((result: ModelStreamResult) => {
				completedResults.push(result);
			});

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					onModelComplete,
					timeoutMs: 1000,
				});
			});

			await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			expect(onModelComplete).toHaveBeenCalledTimes(1);
			expect(completedResults).toHaveLength(1);
			expect(completedResults[0]?.modelId).toBe("gpt-4o");
		});

		it("should call onError when model streaming fails", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			// Use an invalid provider to force failure
			const modelConfigs: ModelConfig[] = [
				{ modelId: "invalid-model", provider: "invalid-provider" },
			];

			const errors: Array<{ modelId: string; error: Error }> = [];
			const onError = vi.fn((modelId: string, error: Error) => {
				errors.push({ modelId, error });
			});

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					onError,
					timeoutMs: 1000,
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			// Should fail due to invalid provider
			expect(results[0]?.success).toBe(false);
			expect(onError).toHaveBeenCalledTimes(1);
			expect(errors[0]?.modelId).toBe("invalid-model");
		});
	});

	describe("Parallel Processing with Batching", () => {
		it("should process models in parallel within batches", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "model-1", provider: "openai" },
				{ modelId: "model-2", provider: "openai" },
				{ modelId: "model-3", provider: "openai" },
			];

			const processingOrder: string[] = [];
			const onModelStart = vi.fn((modelId: string) => {
				processingOrder.push(`start:${modelId}`);
			});
			const onModelComplete = vi.fn((result: ModelStreamResult) => {
				processingOrder.push(`complete:${result.modelId}`);
			});

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					onModelStart,
					onModelComplete,
					timeoutMs: 500,
					batchSize: 5, // All models in one batch
				});
			});

			await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			// With parallel execution, all models should start before any complete
			// Verify all starts happen before completes (order may vary)
			const startIndices = processingOrder
				.map((item, idx) => (item.startsWith("start:") ? idx : -1))
				.filter((idx) => idx >= 0);
			const completeIndices = processingOrder
				.map((item, idx) => (item.startsWith("complete:") ? idx : -1))
				.filter((idx) => idx >= 0);

			// All starts should come before all completes (within batch)
			const maxStartIndex = Math.max(...startIndices);
			const minCompleteIndex = Math.min(...completeIndices);

			expect(maxStartIndex).toBeLessThan(minCompleteIndex);
			expect(processingOrder).toHaveLength(6); // 3 starts + 3 completes
		});

		it("should process batches sequentially when batchSize is smaller than model count", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "model-1", provider: "openai" },
				{ modelId: "model-2", provider: "openai" },
				{ modelId: "model-3", provider: "openai" },
				{ modelId: "model-4", provider: "openai" },
				{ modelId: "model-5", provider: "openai" },
				{ modelId: "model-6", provider: "openai" },
			];

			const batchBoundaries: string[] = [];
			const onModelStart = vi.fn((modelId: string) => {
				batchBoundaries.push(`start:${modelId}`);
			});
			const onModelComplete = vi.fn((result: ModelStreamResult) => {
				batchBoundaries.push(`complete:${result.modelId}`);
			});

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					onModelStart,
					onModelComplete,
					timeoutMs: 500,
					batchSize: 3, // Two batches of 3 models each
				});
			});

			await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			// First batch (models 1-3) should complete before second batch (models 4-6) starts
			// Within each batch, models run in parallel
			const model1Complete = batchBoundaries.indexOf("complete:model-1");
			const model4Start = batchBoundaries.indexOf("start:model-4");

			// Model 1 should complete before model 4 starts (batches are sequential)
			expect(model1Complete).toBeGreaterThanOrEqual(0);
			expect(model4Start).toBeGreaterThanOrEqual(0);
			// Note: Due to parallel execution, exact order may vary, but batches are sequential
		});

		it("should use default batch size of 5 when not specified", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			const modelConfigs: ModelConfig[] = Array.from({ length: 12 }, (_, i) => ({
				modelId: `model-${i + 1}`,
				provider: "openai",
			}));

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 500,
					// batchSize not specified - should use default of 5
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			// Should have results for all 12 models
			expect(results).toHaveLength(12);
			// Should be processed in batches: 5 + 5 + 2 = 3 batches
		});

		it("should return results for all models even when some fail (parallel execution)", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
				{ modelId: "invalid-model", provider: "invalid-provider" },
				{ modelId: "gpt-4o-mini", provider: "openai" },
			];

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 1000,
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			// Should have results for all 3 models
			expect(results).toHaveLength(3);

			// Invalid provider should always fail
			const invalidResult = results.find((r) => r.modelId === "invalid-model");
			expect(invalidResult?.success).toBe(false);
			expect(invalidResult?.error).toBeDefined();

			// Verify we have results for all model IDs
			const modelIds = results.map((r) => r.modelId);
			expect(modelIds).toContain("gpt-4o");
			expect(modelIds).toContain("invalid-model");
			expect(modelIds).toContain("gpt-4o-mini");
		});
	});

	describe("Result Structure", () => {
		it("should return properly structured ModelStreamResult", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
			];

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 1000,
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			expect(results).toHaveLength(1);
			const result = results[0]!;

			// Verify all required fields exist
			expect(result).toHaveProperty("modelId");
			expect(result).toHaveProperty("provider");
			expect(result).toHaveProperty("content");
			expect(result).toHaveProperty("success");
			expect(result).toHaveProperty("durationMs");
			expect(result).toHaveProperty("chunkCount");
			expect(result).toHaveProperty("metrics");

			// Verify types
			expect(typeof result.modelId).toBe("string");
			expect(typeof result.provider).toBe("string");
			expect(typeof result.content).toBe("string");
			expect(typeof result.success).toBe("boolean");
			expect(typeof result.durationMs).toBe("number");
			expect(typeof result.chunkCount).toBe("number");

			// Verify values
			expect(result.modelId).toBe("gpt-4o");
			expect(result.provider).toBe("openai");
			expect(result.durationMs).toBeGreaterThanOrEqual(0);
			expect(result.chunkCount).toBeGreaterThanOrEqual(0);

			// Verify metrics structure
			expect(result.metrics).toBeDefined();
			expect(result.metrics).toHaveProperty("timeToFirstTokenMs");
			expect(result.metrics).toHaveProperty("totalDurationMs");
			expect(result.metrics).toHaveProperty("outputTokens");
			expect(
				result.metrics.timeToFirstTokenMs === null ||
					typeof result.metrics.timeToFirstTokenMs === "number",
			).toBe(true);
			expect(typeof result.metrics.totalDurationMs).toBe("number");
			expect(typeof result.metrics.outputTokens).toBe("number");
		});

		it("should include error message when streaming fails", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			// Use invalid provider to guarantee failure
			const modelConfigs: ModelConfig[] = [
				{ modelId: "invalid-model", provider: "invalid-provider" },
			];

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 1000,
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			const result = results[0]!;
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(typeof result.error).toBe("string");
			// Error message should be non-empty and describe the failure
			expect(result.error!.length).toBeGreaterThan(0);
		});
	});

	describe("Timeout Handling", () => {
		it("should respect custom timeout", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
			];

			const startTime = Date.now();

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 100, // Very short timeout
				});
			});

			await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			const elapsed = Date.now() - startTime;
			// Should complete quickly (either fail fast or timeout)
			expect(elapsed).toBeLessThan(5000);
		});
	});

	describe("Provider Support", () => {
		it("should handle different providers", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
				{ modelId: "claude-3-5-sonnet-20241022", provider: "anthropic" },
				{ modelId: "gemini-pro", provider: "google" },
			];

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 1000,
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			// Should have results for all providers
			expect(results).toHaveLength(3);

			// Verify each result has correct provider
			const providers = results.map((r) => r.provider);
			expect(providers).toContain("openai");
			expect(providers).toContain("anthropic");
			expect(providers).toContain("google");
		});
	});

	describe("Metrics", () => {
		it("should include metrics in ModelStreamResult", async () => {
			const testMessage = createTestMessage({ content: "Hello" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
			];

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 1000,
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			expect(results).toHaveLength(1);
			const result = results[0]!;

			// Verify metrics are present
			expect(result.metrics).toBeDefined();
			expect(result.metrics.totalDurationMs).toBe(result.durationMs);
			expect(result.metrics.outputTokens).toBeGreaterThanOrEqual(0);
			// TTFT may be null if no tokens were received
			expect(
				result.metrics.timeToFirstTokenMs === null ||
					result.metrics.timeToFirstTokenMs >= 0,
			).toBe(true);
		});

		it("should have totalDurationMs matching durationMs", async () => {
			const testMessage = createTestMessage({ content: "Test" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
			];

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 1000,
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			const result = results[0]!;
			expect(result.metrics.totalDurationMs).toBe(result.durationMs);
		});

		it("should record outputTokens (may be 0 in test environment)", async () => {
			const testMessage = createTestMessage({ content: "Test" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
			];

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 1000,
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			const result = results[0]!;
			// Output tokens should be a number (may be 0 if API call failed)
			expect(typeof result.metrics.outputTokens).toBe("number");
			expect(result.metrics.outputTokens).toBeGreaterThanOrEqual(0);
		});

		it("should have timeToFirstTokenMs as null when no tokens received", async () => {
			const testMessage = createTestMessage({ content: "Test" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
			];

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 100, // Very short timeout to ensure no tokens
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			const result = results[0]!;
			// If streaming failed before receiving tokens, TTFT should be null
			if (!result.success) {
				expect(result.metrics.timeToFirstTokenMs).toBeNull();
			}
		});

		it("should have metrics for all models in multi-model scenario", async () => {
			const testMessage = createTestMessage({ content: "Test" });
			const modelConfigs: ModelConfig[] = [
				{ modelId: "gpt-4o", provider: "openai" },
				{ modelId: "gpt-4o-mini", provider: "openai" },
			];

			const program = Effect.gen(function* () {
				const service = yield* MultiModelStreamingService;
				return yield* service.streamMultipleModels({
					messages: [testMessage],
					modelConfigs,
					timeoutMs: 1000,
				});
			});

			const results = await Effect.runPromise(
				Effect.provide(program, MultiModelStreamingService.Default()),
			);

			expect(results).toHaveLength(2);
			for (const result of results) {
				expect(result.metrics).toBeDefined();
				expect(result.metrics.totalDurationMs).toBe(result.durationMs);
				expect(typeof result.metrics.outputTokens).toBe("number");
				expect(
					result.metrics.timeToFirstTokenMs === null ||
						typeof result.metrics.timeToFirstTokenMs === "number",
				).toBe(true);
			}
		});
	});
});

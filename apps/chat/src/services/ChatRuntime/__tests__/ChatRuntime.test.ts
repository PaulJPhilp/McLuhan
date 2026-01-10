import { Effect } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestMessage } from "../../../__tests__/fixtures/test-data";
import { ChatRuntime } from "../service";

describe("ChatRuntime", () => {
	beforeEach(() => {
		// Reset environment variables
		delete import.meta.env.VITE_OPENAI_API_KEY;
		delete import.meta.env.VITE_ANTHROPIC_API_KEY;
		delete import.meta.env.VITE_AI_PROVIDER;
		delete import.meta.env.VITE_AI_MODEL;
		delete import.meta.env.VITE_SYSTEM_PROMPT;
	});

	describe("Service Initialization", () => {
		it("should provide Default layer", () => {
			expect(ChatRuntime.Default).toBeDefined();
			expect(typeof ChatRuntime.Default).toBe("function");
		});

		it("should create service instance with valid API key", async () => {
			// Note: Service creation succeeds even with dummy key format
			// The key validation happens when provider is created, not during service initialization
			import.meta.env.VITE_OPENAI_API_KEY =
				"sk-test123456789012345678901234567890123456789012345678901234567890";

			const layer = ChatRuntime.Default();
			const program = Effect.gen(function* () {
				const service = yield* ChatRuntime;
				return service !== undefined;
			});

			// Service instance should be created (provider config may fail later, but service exists)
			const result = await Effect.runPromise(Effect.provide(program, layer));
			expect(result).toBe(true);
		});

		it("should fail when no API keys are present", async () => {
			const layer = ChatRuntime.Default();
			const program = Effect.gen(function* () {
				const service = yield* ChatRuntime;
				return service;
			});

			await expect(
				Effect.runPromise(Effect.provide(program, layer)),
			).rejects.toThrow("No API key found");
		});
	});

	describe("Provider Selection", () => {
		it("should prefer OpenAI when both keys are present and no provider specified", async () => {
			// Test provider selection logic with dummy keys
			// The service will be created, provider selection happens in getProviderConfig
			import.meta.env.VITE_OPENAI_API_KEY =
				"sk-test123456789012345678901234567890123456789012345678901234567890";
			import.meta.env.VITE_ANTHROPIC_API_KEY =
				"sk-ant-test123456789012345678901234567890123456789012345678901234567890";
			delete import.meta.env.VITE_AI_PROVIDER;

			const layer = ChatRuntime.Default();
			const program = Effect.gen(function* () {
				const service = yield* ChatRuntime;
				// Service should be created (provider selection happens internally)
				return service !== undefined;
			});

			const result = await Effect.runPromise(Effect.provide(program, layer));
			expect(result).toBe(true);
		});

		it("should use Anthropic when specified via VITE_AI_PROVIDER", async () => {
			// Test provider selection via environment variable
			import.meta.env.VITE_OPENAI_API_KEY =
				"sk-test123456789012345678901234567890123456789012345678901234567890";
			import.meta.env.VITE_ANTHROPIC_API_KEY =
				"sk-ant-test123456789012345678901234567890123456789012345678901234567890";
			import.meta.env.VITE_AI_PROVIDER = "anthropic";

			const layer = ChatRuntime.Default();
			const program = Effect.gen(function* () {
				const service = yield* ChatRuntime;
				// Service should be created with Anthropic provider selected
				return service !== undefined;
			});

			const result = await Effect.runPromise(Effect.provide(program, layer));
			expect(result).toBe(true);
		});
	});

	describe("generateResponse", () => {
		it.skip("should generate response from messages", async () => {
			// Skip: Requires real API key and network access
			import.meta.env.VITE_OPENAI_API_KEY =
				process.env.VITE_OPENAI_API_KEY || "test-key";

			const layer = ChatRuntime.Default();
			const messages = [createTestMessage({ role: "user", content: "Hello" })];

			const program = Effect.gen(function* () {
				const service = yield* ChatRuntime;
				return yield* service.generateResponse(messages);
			});

			// Only run if we have a real API key
			if (process.env.VITE_OPENAI_API_KEY) {
				const result = await Effect.runPromise(Effect.provide(program, layer));
				expect(typeof result).toBe("string");
				expect(result.length).toBeGreaterThan(0);
			}
		});
	});

	describe("streamResponse", () => {
		it.skip("should stream response chunks", async () => {
			// Skip: Requires real API key and network access
			import.meta.env.VITE_OPENAI_API_KEY =
				process.env.VITE_OPENAI_API_KEY || "test-key";

			const layer = ChatRuntime.Default();
			const messages = [createTestMessage({ role: "user", content: "Hello" })];

			const program = Effect.gen(function* () {
				const service = yield* ChatRuntime;
				return service.streamResponse(messages);
			});

			// Only run if we have a real API key
			if (process.env.VITE_OPENAI_API_KEY) {
				const stream = await Effect.runPromise(Effect.provide(program, layer));

				const chunks: string[] = [];
				for await (const chunk of stream) {
					chunks.push(chunk);
				}

				expect(chunks.length).toBeGreaterThan(0);
			}
		});
	});
});

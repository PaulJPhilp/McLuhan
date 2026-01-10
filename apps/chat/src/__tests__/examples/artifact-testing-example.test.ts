/**
 * Example tests demonstrating how to test artifacts in the McLuhan chat app
 *
 * This file shows patterns for:
 * - Using artifact fixtures
 * - Mocking services
 * - Testing integration flows
 * - Testing components with artifacts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Effect, Layer } from "effect";
import {
	ArtifactExtractionService,
	ArtifactStorageService,
} from "../../services/index.js";
import {
	createTestCodeArtifact,
	createTestJsonArtifact,
	createTestMermaidArtifact,
	createTestArtifacts,
} from "../fixtures/artifacts.js";
import { createTestMessage, createTestMessages } from "../fixtures/test-data.js";
import {
	createMockArtifactExtractionService,
	createMockArtifactStorageService,
	createTestServiceLayer,
	createCodeExtractionMock,
} from "../helpers/service-mocks.js";
import { testArtifactFlow, testArtifactStorage } from "../helpers/integration-helpers.js";

describe("Artifact Testing Examples", () => {
	describe("Using Fixtures", () => {
		it("should create code artifacts with fixtures", () => {
			const artifact = createTestCodeArtifact();

			expect(artifact.id).toBeDefined();
			expect(artifact.type.category).toBe("code");
			expect(artifact.type.language).toBe("typescript");
			expect(artifact.content).toContain("console.log");
		});

		it("should create custom artifacts with overrides", () => {
			const custom = createTestCodeArtifact({
				type: { category: "code", language: "python" },
				content: "print('hello')",
			});

			expect(custom.type.language).toBe("python");
			expect(custom.content).toBe("print('hello')");
		});

		it("should create all artifact types", () => {
			const artifacts = createTestArtifacts();

			expect(artifacts).toHaveLength(4);
			expect(artifacts.map((a) => a.type.category)).toEqual([
				"code",
				"diagram",
				"data",
				"diagram",
			]);
		});

		it("should create test messages with artifacts", () => {
			const message = createTestMessage({
				role: "assistant",
				metadata: { hasArtifacts: true },
			});

			expect(message.role).toBe("assistant");
			expect(message.metadata?.hasArtifacts).toBe(true);
		});

		it("should create multiple test messages", () => {
			const messages = createTestMessages(5, "user");

			expect(messages).toHaveLength(5);
			expect(messages.every((m) => m.role === "user")).toBe(true);
		});
	});

	describe("Using Service Mocks", () => {
		it("should create mock extraction service", async () => {
			const mockLayer = createMockArtifactExtractionService();

			const program = Effect.gen(function* () {
				const extraction = yield* ArtifactExtractionService;
				return yield* extraction.extractFromContent("test");
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(mockLayer)),
			);

			expect(result).toEqual([]);
		});

		it("should create mock extraction that returns artifacts", async () => {
			const testArtifact = createTestCodeArtifact();
			const mockLayer = createMockArtifactExtractionService(
				() => Effect.succeed([testArtifact]),
			);

			const program = Effect.gen(function* () {
				const extraction = yield* ArtifactExtractionService;
				return yield* extraction.extractFromContent("anything");
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(mockLayer)),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.id).toBe(testArtifact.id);
		});

		it("should create mock storage service", async () => {
			const mockLayer = createMockArtifactStorageService();
			const artifact = createTestCodeArtifact();
			const messageId = "test-msg";

			const program = Effect.gen(function* () {
				const storage = yield* ArtifactStorageService;

				// Save
				yield* storage.saveArtifacts(messageId, [artifact]);

				// Retrieve
				const retrieved = yield* storage.getArtifacts(messageId);

				return retrieved;
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(mockLayer)),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.id).toBe(artifact.id);
		});

		it("should create code extraction mock", async () => {
			const mockLayer = createCodeExtractionMock();
			const content = "Test\n```python\nprint('hello')\n```\nMore text";

			const program = Effect.gen(function* () {
				const extraction = yield* ArtifactExtractionService;
				return yield* extraction.extractFromContent(content);
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(mockLayer)),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.content).toContain("print('hello')");
		});

		it("should combine multiple service mocks", async () => {
			const extractionLayer = createCodeExtractionMock();
			const storageLayer = createMockArtifactStorageService();
			const testLayer = createTestServiceLayer(
				extractionLayer,
				storageLayer,
			);

			const content = "```javascript\nconsole.log('test')\n```";
			const messageId = "msg-1";

			const program = Effect.gen(function* () {
				const extraction = yield* ArtifactExtractionService;
				const storage = yield* ArtifactStorageService;

				const extracted = yield* extraction.extractFromContent(content);
				yield* storage.saveArtifacts(messageId, extracted);
				const retrieved = yield* storage.getArtifacts(messageId);

				return { extracted, retrieved };
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(testLayer)),
			);

			expect(result.extracted.length).toBeGreaterThan(0);
			expect(result.retrieved).toEqual(result.extracted);
		});
	});

	describe("Integration Testing", () => {
		beforeEach(() => {
			localStorage.clear();
		});

		it("should test artifact storage flow", async () => {
			const messageId = "msg-integration";
			const artifact = createTestCodeArtifact();

			const result = await testArtifactStorage(messageId, [artifact]);

			expect(result.saved).toHaveLength(1);
			expect(result.retrieved).toHaveLength(1);
			expect(result.stats.artifactCount).toBe(1);
		});

		it("should test complete artifact flow", async () => {
			const content = `Here's some code:

\`\`\`javascript
function example() {
  return 42;
}
\`\`\`

And JSON:

\`\`\`json
{"result": 42}
\`\`\`
`;

			// Use code extraction mock to actually extract from markdown
			const extractionLayer = createCodeExtractionMock();
			const result = await testArtifactFlow(
				content,
				"msg-flow",
				extractionLayer,
			);

			expect(result.extracted.length).toBeGreaterThan(0);
			expect(result.retrieved.length).toBe(result.extracted.length);
			expect(result.stats.artifactCount).toBeGreaterThan(0);
		});

		it("should test flow with custom extraction", async () => {
			const extractionLayer = createCodeExtractionMock();
			const content = "Before\n```python\nx = 1\n```\nAfter";

			const result = await testArtifactFlow(
				content,
				"msg-custom",
				extractionLayer,
			);

			expect(result.extracted).toHaveLength(1);
			expect(result.extracted[0]?.content).toContain("x = 1");
		});

		it("should test multiple messages with artifacts", async () => {
			const storageLayer = createMockArtifactStorageService();

			const program = Effect.gen(function* () {
				const storage = yield* ArtifactStorageService;

				// Save artifacts for multiple messages
				const messages = createTestMessages(3, "assistant");
				const artifacts = createTestArtifacts();

				for (const msg of messages) {
					yield* storage.saveArtifacts(
						msg.id,
						artifacts.slice(0, 2),
					);
				}

				// Retrieve and verify
				const results = yield* Effect.all(
					messages.map((msg) =>
						storage.getArtifacts(msg.id),
					),
				);

				return {
					messageCount: messages.length,
					artifactsPerMessage: results.map((r) => r.length),
				};
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(storageLayer)),
			);

			expect(result.messageCount).toBe(3);
			expect(result.artifactsPerMessage.every((c) => c === 2)).toBe(true);
		});
	});

	describe("Error Handling in Tests", () => {
		it("should handle artifact retrieval errors", async () => {
			const storageLayer = createMockArtifactStorageService();

			const program = Effect.gen(function* () {
				const storage = yield* ArtifactStorageService;

				// Try to get non-existent artifacts
				const result = yield* storage.getArtifacts(
					"non-existent",
				);

				return result;
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(storageLayer)),
			);

			expect(result).toEqual([]);
		});

		it("should handle storage stats", async () => {
			const storageLayer = createMockArtifactStorageService();
			const artifacts = createTestArtifacts();

			const program = Effect.gen(function* () {
				const storage = yield* ArtifactStorageService;

				// Save multiple artifacts
				yield* storage.saveArtifacts("msg-1", artifacts);

				// Get stats
				const stats = yield* storage.getStorageStats();

				return stats;
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(storageLayer)),
			);

			expect(result.artifactCount).toBe(artifacts.length);
			expect(result.totalBytes).toBeGreaterThan(0);
			expect(result.usagePercent).toBeGreaterThan(0);
		});
	});

	describe("Type Safety", () => {
		it("should maintain type safety with fixtures", () => {
			const code = createTestCodeArtifact();
			const mermaid = createTestMermaidArtifact();
			const json = createTestJsonArtifact();

			// Type safe access
			if (code.type.category === "code") {
				expect(code.type.language).toBeDefined();
			}

			if (mermaid.type.category === "diagram") {
				expect(mermaid.type.diagramType).toBe("mermaid");
			}

			if (json.type.category === "data") {
				expect(json.type.dataFormat).toBe("json");
			}
		});

		it("should maintain type safety with mocks", async () => {
			const mockLayer = createMockArtifactStorageService();

			const program = Effect.gen(function* () {
				const storage = yield* ArtifactStorageService;
				const artifact = createTestCodeArtifact();

				// Type-safe: artifact is Artifact[]
				yield* storage.saveArtifacts("msg", [artifact]);

				// Type-safe: returns Artifact[]
				const result = yield* storage.getArtifacts("msg");

				return result;
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(mockLayer)),
			);

			expect(Array.isArray(result)).toBe(true);
		});
	});
});

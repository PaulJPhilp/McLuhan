import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Effect } from "effect";
import type { Artifact } from "effect-artifact";
import { ArtifactStorageService, ArtifactStorageError } from "../../index.js";

describe("ArtifactStorageService", () => {
	const testMessageId = "test-message-123";

	const createTestArtifact = (
		id: string,
		language: string = "typescript",
	): Artifact => ({
		id,
		type: { category: "code", language },
		content: `function example() {\n  console.log("Hello, World!");\n}`,
		metadata: {
			title: "Example Function",
			tags: ["example"],
		},
	});

	beforeEach(() => {
		// Clear localStorage before each test
		localStorage.clear();
	});

	afterEach(() => {
		// Clean up after each test
		localStorage.clear();
	});

	it("should save and retrieve artifacts", async () => {
		const artifact = createTestArtifact("artifact-1");
		const artifacts = [artifact];

		const program = Effect.gen(function* () {
			const storage = yield* ArtifactStorageService;

			// Save artifacts
			yield* storage.saveArtifacts(testMessageId, artifacts);

			// Retrieve artifacts
			const retrieved = yield* storage.getArtifacts(testMessageId);

			expect(retrieved).toHaveLength(1);
			expect(retrieved[0]?.id).toBe("artifact-1");
			expect(retrieved[0]?.type.category).toBe("code");
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactStorageService.Default())),
		);
	});

	it("should return empty array for non-existent artifacts", async () => {
		const program = Effect.gen(function* () {
			const storage = yield* ArtifactStorageService;

			const retrieved = yield* storage.getArtifacts("non-existent-id");

			expect(retrieved).toEqual([]);
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactStorageService.Default())),
		);
	});

	it("should save multiple artifacts", async () => {
		const artifact1 = createTestArtifact("artifact-1", "typescript");
		const artifact2 = createTestArtifact("artifact-2", "python");
		const artifacts = [artifact1, artifact2];

		const program = Effect.gen(function* () {
			const storage = yield* ArtifactStorageService;

			yield* storage.saveArtifacts(testMessageId, artifacts);
			const retrieved = yield* storage.getArtifacts(testMessageId);

			expect(retrieved).toHaveLength(2);
			expect(retrieved[0]?.type.language).toBe("typescript");
			expect(retrieved[1]?.type.language).toBe("python");
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactStorageService.Default())),
		);
	});

	it("should delete artifacts", async () => {
		const artifact = createTestArtifact("artifact-1");

		const program = Effect.gen(function* () {
			const storage = yield* ArtifactStorageService;

			// Save artifacts
			yield* storage.saveArtifacts(testMessageId, [artifact]);
			let retrieved = yield* storage.getArtifacts(testMessageId);
			expect(retrieved).toHaveLength(1);

			// Delete artifacts
			yield* storage.deleteArtifacts(testMessageId);
			retrieved = yield* storage.getArtifacts(testMessageId);

			expect(retrieved).toEqual([]);
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactStorageService.Default())),
		);
	});

	it("should get storage stats", async () => {
		const artifact1 = createTestArtifact("artifact-1");
		const artifact2 = createTestArtifact("artifact-2");

		const program = Effect.gen(function* () {
			const storage = yield* ArtifactStorageService;

			// Save artifacts
			yield* storage.saveArtifacts("msg-1", [artifact1]);
			yield* storage.saveArtifacts("msg-2", [artifact2]);

			// Get stats
			const stats = yield* storage.getStorageStats();

			expect(stats.artifactCount).toBe(2);
			expect(stats.totalBytes).toBeGreaterThan(0);
			expect(stats.usagePercent).toBeGreaterThan(0);
			expect(stats.quotaEstimate).toBe(5_242_880); // 5MB
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactStorageService.Default())),
		);
	});

	it("should clear old artifacts", async () => {
		const artifact1 = createTestArtifact("artifact-1");
		const artifact2 = createTestArtifact("artifact-2");

		const program = Effect.gen(function* () {
			const storage = yield* ArtifactStorageService;

			// Save first artifact
			yield* storage.saveArtifacts("msg-1", [artifact1]);

			// Wait a bit and save second artifact
			yield* Effect.sleep("100 millis");
			yield* storage.saveArtifacts("msg-2", [artifact2]);

			// Clear artifacts older than 50ms (should delete msg-1 but not msg-2)
			const deleted = yield* storage.clearOldArtifacts(50);

			expect(deleted).toBe(1);

			// Verify first artifact is gone
			const retrieved1 = yield* storage.getArtifacts("msg-1");
			expect(retrieved1).toEqual([]);

			// Verify second artifact still exists
			const retrieved2 = yield* storage.getArtifacts("msg-2");
			expect(retrieved2).toHaveLength(1);
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactStorageService.Default())),
		);
	});

	it("should handle invalid JSON gracefully", async () => {
		const program = Effect.gen(function* () {
			const storage = yield* ArtifactStorageService;

			// Manually set invalid JSON in localStorage
			localStorage.setItem("chat-artifacts:invalid", "not-valid-json");

			// Should catch the error and provide helpful message
			const result = yield* storage.getArtifacts("invalid").pipe(Effect.either);

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				const error = result.left;
				expect(error).toBeInstanceOf(ArtifactStorageError);
				expect((error as ArtifactStorageError).code).toBe("INVALID_DATA");
			}
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactStorageService.Default())),
		);
	});

	it("should handle different artifact types", async () => {
		const codeArtifact: Artifact = {
			id: "code-1",
			type: { category: "code", language: "javascript" },
			content: "console.log('hello');",
			metadata: { title: "JS Code" },
		};

		const jsonArtifact: Artifact = {
			id: "json-1",
			type: { category: "data", dataFormat: "json" },
			content: '{"key": "value"}',
			metadata: { title: "JSON Data" },
		};

		const mermaidArtifact: Artifact = {
			id: "mermaid-1",
			type: { category: "diagram", diagramType: "mermaid" },
			content: "graph LR\\n  A --> B",
			metadata: { title: "Diagram" },
		};

		const program = Effect.gen(function* () {
			const storage = yield* ArtifactStorageService;

			const artifacts = [codeArtifact, jsonArtifact, mermaidArtifact];
			yield* storage.saveArtifacts(testMessageId, artifacts);

			const retrieved = yield* storage.getArtifacts(testMessageId);

			expect(retrieved).toHaveLength(3);
			expect(retrieved[0]?.type.category).toBe("code");
			expect(retrieved[1]?.type.category).toBe("data");
			expect(retrieved[2]?.type.category).toBe("diagram");
		});

		await Effect.runPromise(
			program.pipe(Effect.provide(ArtifactStorageService.Default())),
		);
	});
});

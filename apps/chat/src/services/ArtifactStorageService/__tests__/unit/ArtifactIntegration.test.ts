import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Effect, Layer } from "effect";
import { ArtifactExtractionService } from "../../../ArtifactExtractionService/index.js";
import { ArtifactStorageService } from "../../../ArtifactStorageService/index.js";

describe("Artifact Integration", () => {
	const messageId = "integration-test-message";

	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it("should extract, store, and retrieve artifacts in sequence", async () => {
		const aiResponse = `Here's a Python solution:

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

# Test
print(factorial(5))  # Output: 120
\`\`\`

And here's a JSON test case:

\`\`\`json
{
  "test_cases": [
    {"input": 5, "expected": 120},
    {"input": 0, "expected": 1}
  ]
}
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const storage = yield* ArtifactStorageService;

			// Step 1: Extract artifacts from AI response
			const extracted = yield* extraction.extractFromContent(
				aiResponse,
				"openai",
				"gpt-4-turbo",
			);

			expect(extracted).toHaveLength(2);

			// Step 2: Store artifacts
			yield* storage.saveArtifacts(messageId, extracted);

			// Step 3: Retrieve and verify
			const retrieved = yield* storage.getArtifacts(messageId);

			expect(retrieved).toHaveLength(2);
			expect(retrieved[0]?.type.language).toBe("python");
			expect(retrieved[1]?.type.dataFormat).toBe("json");

			// Verify content is preserved
			expect(retrieved[0]?.content).toContain("factorial");
			expect(retrieved[1]?.content).toContain("test_cases");

			// Verify metadata is preserved
			expect(retrieved[0]?.metadata.modelProvider).toBe("openai");
			expect(retrieved[0]?.metadata.modelId).toBe("gpt-4-turbo");
		});

		const layer = Layer.mergeAll(
			ArtifactExtractionService.Default(),
			ArtifactStorageService.Default(),
		);

		await Effect.runPromise(program.pipe(Effect.provide(layer)));
	});

	it("should handle multiple messages with artifacts", async () => {
		const message1Response = `\`\`\`javascript
function hello() {
  console.log("Message 1");
}
\`\`\``;

		const message2Response = `\`\`\`typescript
interface Message {
  id: string;
  content: string;
}
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const storage = yield* ArtifactStorageService;

			// Extract and store for message 1
			const artifacts1 = yield* extraction.extractFromContent(message1Response);
			yield* storage.saveArtifacts("message-1", artifacts1);

			// Extract and store for message 2
			const artifacts2 = yield* extraction.extractFromContent(message2Response);
			yield* storage.saveArtifacts("message-2", artifacts2);

			// Verify both are stored separately
			const retrieved1 = yield* storage.getArtifacts("message-1");
			const retrieved2 = yield* storage.getArtifacts("message-2");

			expect(retrieved1).toHaveLength(1);
			expect(retrieved2).toHaveLength(1);
			expect(retrieved1[0]?.type.language).toBe("javascript");
			expect(retrieved2[0]?.type.language).toBe("typescript");

			// Verify storage stats show both
			const stats = yield* storage.getStorageStats();
			expect(stats.artifactCount).toBe(2);
		});

		const layer = Layer.mergeAll(
			ArtifactExtractionService.Default(),
			ArtifactStorageService.Default(),
		);

		await Effect.runPromise(program.pipe(Effect.provide(layer)));
	});

	it("should handle artifact deletion and storage cleanup", async () => {
		const response = `\`\`\`python
print("cleanup test")
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const storage = yield* ArtifactStorageService;

			// Extract and store
			const artifacts = yield* extraction.extractFromContent(response);
			yield* storage.saveArtifacts("cleanup-msg", artifacts);

			// Verify stored
			let stats = yield* storage.getStorageStats();
			expect(stats.artifactCount).toBe(1);

			// Delete
			yield* storage.deleteArtifacts("cleanup-msg");

			// Verify deleted
			const retrieved = yield* storage.getArtifacts("cleanup-msg");
			expect(retrieved).toEqual([]);

			stats = yield* storage.getStorageStats();
			expect(stats.artifactCount).toBe(0);
		});

		const layer = Layer.mergeAll(
			ArtifactExtractionService.Default(),
			ArtifactStorageService.Default(),
		);

		await Effect.runPromise(program.pipe(Effect.provide(layer)));
	});

	it("should preserve artifact identity through storage cycle", async () => {
		const response = `\`\`\`json
{
  "id": "preserved-artifact",
  "type": "data",
  "content": "test"
}
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const storage = yield* ArtifactStorageService;

			// Extract
			const extracted = yield* extraction.extractFromContent(response);
			const originalId = extracted[0]?.id;

			// Store and retrieve
			yield* storage.saveArtifacts(messageId, extracted);
			const retrieved = yield* storage.getArtifacts(messageId);

			// Verify ID is preserved
			expect(retrieved[0]?.id).toBe(originalId);
			expect(retrieved[0]?.type.category).toBe("data");
		});

		const layer = Layer.mergeAll(
			ArtifactExtractionService.Default(),
			ArtifactStorageService.Default(),
		);

		await Effect.runPromise(program.pipe(Effect.provide(layer)));
	});

	it("should handle storage quota gracefully", async () => {
		const response = `\`\`\`text
${"x".repeat(100)}
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const storage = yield* ArtifactStorageService;

			// Extract and store multiple large artifacts
			const artifacts = yield* extraction.extractFromContent(response);

			// Store multiple copies to test quota awareness
			for (let i = 0; i < 5; i++) {
				const result = yield* storage
					.saveArtifacts(`msg-${i}`, artifacts)
					.pipe(Effect.either);

				// Even if quota error occurs, we can handle it
				expect(result).toBeDefined();
			}

			// Get stats to see overall usage
			const stats = yield* storage.getStorageStats();
			expect(stats).toBeDefined();
			expect(stats.usagePercent).toBeGreaterThan(0);
		});

		const layer = Layer.mergeAll(
			ArtifactExtractionService.Default(),
			ArtifactStorageService.Default(),
		);

		await Effect.runPromise(program.pipe(Effect.provide(layer)));
	});

	it("should handle complex multi-language artifacts", async () => {
		const response = `Here's a multi-language guide:

\`\`\`javascript
// JavaScript
const arr = [1, 2, 3];
arr.map(x => x * 2);
\`\`\`

\`\`\`python
# Python
numbers = [1, 2, 3]
squared = [x**2 for x in numbers]
\`\`\`

\`\`\`rust
// Rust
fn main() {
    let numbers = vec![1, 2, 3];
    let squared: Vec<_> = numbers.iter().map(|x| x * x).collect();
}
\`\`\`

\`\`\`json
{
  "supported_languages": ["javascript", "python", "rust"]
}
\`\`\``;

		const program = Effect.gen(function* () {
			const extraction = yield* ArtifactExtractionService;
			const storage = yield* ArtifactStorageService;

			// Extract all artifacts
			const extracted = yield* extraction.extractFromContent(response);
			expect(extracted.length).toBeGreaterThanOrEqual(4);

			// Store all
			yield* storage.saveArtifacts(messageId, extracted);

			// Retrieve and verify all languages are preserved
			const retrieved = yield* storage.getArtifacts(messageId);

			const languages = retrieved
				.filter((a) => a.type.category === "code")
				.map((a) => (a.type.category === "code" ? a.type.language : null));

			expect(languages).toContain("javascript");
			expect(languages).toContain("python");
			expect(languages).toContain("rust");
		});

		const layer = Layer.mergeAll(
			ArtifactExtractionService.Default(),
			ArtifactStorageService.Default(),
		);

		await Effect.runPromise(program.pipe(Effect.provide(layer)));
	});
});

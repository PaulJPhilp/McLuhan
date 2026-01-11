import { Effect, Layer } from "effect";
import type { Artifact } from "effect-artifact";
import {
	ArtifactExtractionService,
	type ArtifactExtractionServiceSchema,
} from "../../services/ArtifactExtractionService/index.js";
import {
	ArtifactStorageService,
	type ArtifactStorageServiceSchema,
} from "../../services/ArtifactStorageService/index.js";

/**
 * Create a mock ArtifactExtractionService for testing
 * By default, returns no artifacts - override extractFromContent for custom behavior
 */
export function createMockArtifactExtractionService(
	extractFromContent?: (
		content: string,
		modelProvider?: string,
		modelId?: string,
	) => Effect.Effect<readonly Artifact[]>,
): Layer.Layer<ArtifactExtractionService> {
	return Layer.succeed(ArtifactExtractionService, {
		_tag: "ArtifactExtractionService",
		extractFromContent:
			extractFromContent || (() => Effect.succeed([] as readonly Artifact[])),
	} as any);
}

/**
 * Create a mock ArtifactStorageService for testing
 * Uses in-memory Map to simulate localStorage
 */
export function createMockArtifactStorageService(
	initialData?: Map<string, Artifact[]>,
): Layer.Layer<ArtifactStorageService> {
	const storage = initialData || new Map<string, Artifact[]>();

	return Layer.succeed(ArtifactStorageService, {
		_tag: "ArtifactStorageService",
		saveArtifacts: (messageId: string, artifacts: readonly Artifact[]) =>
			Effect.sync(() => {
				storage.set(messageId, [...artifacts]);
			}),

		getArtifacts: (messageId: string) =>
			Effect.sync(() => {
				return storage.get(messageId) || [];
			}),

		deleteArtifacts: (messageId: string) =>
			Effect.sync(() => {
				storage.delete(messageId);
			}),

		getStorageStats: () =>
			Effect.sync(() => {
				let totalBytes = 0;
				let artifactCount = 0;

				for (const [key, artifacts] of storage) {
					const data = JSON.stringify(artifacts);
					totalBytes += key.length + data.length;
					artifactCount += artifacts.length;
				}

				return {
					totalBytes,
					artifactCount,
					quotaEstimate: 5_242_880, // 5MB
					usagePercent: (totalBytes / 5_242_880) * 100,
				};
			}),

		clearOldArtifacts: (olderThanMs: number) =>
			Effect.sync(() => {
				const keysToDelete: string[] = [];
				const cutoffTime = Date.now() - olderThanMs;

				// In mock, delete all for simplicity
				// In real tests, track timestamps if needed
				return keysToDelete.length;
			}),
	} as any);
}

/**
 * Create a mock ArtifactExtractionService that extracts code blocks
 * Useful for testing extraction behavior
 */
export function createCodeExtractionMock(): Layer.Layer<ArtifactExtractionService> {
	return createMockArtifactExtractionService((content) =>
		Effect.sync(() => {
			const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
			const artifacts: Artifact[] = [];
			let match;

			while ((match = codeBlockRegex.exec(content)) !== null) {
				const [, language = "text", code] = match;
				const now = new Date();
				artifacts.push({
					id: crypto.randomUUID(),
					type: { category: "code", language },
					content: code?.trim() || "",
					metadata: {
						title: `${language.charAt(0).toUpperCase() + language.slice(1)} Code`,
						version: "1.0.0",
						created: now,
						updated: now,
						tags: ["ai-generated", language],
					},
				});
			}

			return artifacts;
		}),
	);
}

/**
 * Combine multiple service mocks into a test layer
 */
export function createTestServiceLayer(
	extractionLayer?: Layer.Layer<ArtifactExtractionService>,
	storageLayer?: Layer.Layer<ArtifactStorageService>,
): Layer.Layer<ArtifactExtractionService | ArtifactStorageService> {
	return Layer.mergeAll(
		extractionLayer || createMockArtifactExtractionService(),
		storageLayer || createMockArtifactStorageService(),
	);
}

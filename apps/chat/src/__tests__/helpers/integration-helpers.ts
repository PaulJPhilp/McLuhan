import { Effect, Layer, ManagedRuntime } from "effect";
import type { Artifact } from "effect-artifact";
import {
	ArtifactExtractionService,
	type ArtifactExtractionServiceSchema,
} from "../../services/ArtifactExtractionService/index.js";
import {
	ArtifactStorageService,
	type ArtifactStorageServiceSchema,
} from "../../services/ArtifactStorageService/index.js";
import {
	createMockArtifactExtractionService,
	createMockArtifactStorageService,
} from "./service-mocks.js";

/**
 * Helper to run Effect programs in tests with a managed runtime
 */
export function runEffect<A, E>(
	effect: Effect.Effect<A, E>,
	layer?: Layer.Layer<ArtifactExtractionService | ArtifactStorageService>,
): Promise<A> {
	const testLayer = layer || Layer.mergeAll(
		createMockArtifactExtractionService(),
		createMockArtifactStorageService(),
	);

	const runtime = ManagedRuntime.make(testLayer);
	return runtime.runPromise(effect);
}

/**
 * Helper to run Effect programs synchronously in tests
 */
export function runEffectSync<A, E>(
	effect: Effect.Effect<A, E>,
	layer?: Layer.Layer<ArtifactExtractionService | ArtifactStorageService>,
): A {
	const testLayer = layer || Layer.mergeAll(
		createMockArtifactExtractionService(),
		createMockArtifactStorageService(),
	);

	const runtime = ManagedRuntime.make(testLayer);
	return runtime.runSync(effect);
}

/**
 * Helper to test artifact extraction flow
 */
export async function testArtifactExtraction(
	content: string,
	extractionLayer?: Layer.Layer<ArtifactExtractionService>,
	expectedCount?: number,
): Promise<Artifact[]> {
	const program = Effect.gen(function* () {
		const extraction = yield* ArtifactExtractionService;
		return yield* extraction.extractFromContent(content);
	});

	const testLayer = extractionLayer ||
		createMockArtifactExtractionService() || Layer.empty;
	const runtime = ManagedRuntime.make(
		testLayer as any
	);
	const artifacts = await runtime.runPromise(program);

	if (expectedCount !== undefined) {
		if (artifacts.length !== expectedCount) {
			throw new Error(
				`Expected ${expectedCount} artifacts, got ${artifacts.length}`,
			);
		}
	}

	return artifacts;
}

/**
 * Helper to test artifact storage flow
 */
export async function testArtifactStorage(
	messageId: string,
	artifacts: Artifact[],
	storageLayer?: Layer.Layer<ArtifactStorageService>,
): Promise<{
	saved: Artifact[];
	retrieved: Artifact[];
	stats: Awaited<ReturnType<ArtifactStorageServiceSchema["getStorageStats"]>>;
}> {
	const program = Effect.gen(function* () {
		const storage = yield* ArtifactStorageService;

		// Save artifacts
		yield* storage.saveArtifacts(messageId, artifacts);

		// Retrieve artifacts
		const retrieved = yield* storage.getArtifacts(messageId);

		// Get stats
		const stats = yield* storage.getStorageStats();

		return { saved: artifacts, retrieved, stats };
	});

	const testLayer = storageLayer || createMockArtifactStorageService();
	const runtime = ManagedRuntime.make(testLayer as any);
	return runtime.runPromise(program);
}

/**
 * Helper to test end-to-end artifact flow (extraction + storage)
 */
export async function testArtifactFlow(
	content: string,
	messageId: string,
	extractionLayer?: Layer.Layer<ArtifactExtractionService>,
	storageLayer?: Layer.Layer<ArtifactStorageService>,
): Promise<{
	extracted: Artifact[];
	retrieved: Artifact[];
	stats: Awaited<ReturnType<ArtifactStorageServiceSchema["getStorageStats"]>>;
}> {
	const program = Effect.gen(function* () {
		const extraction = yield* ArtifactExtractionService;
		const storage = yield* ArtifactStorageService;

		// Extract artifacts
		const extracted = yield* extraction.extractFromContent(content);

		// Save artifacts
		if (extracted.length > 0) {
			yield* storage.saveArtifacts(messageId, extracted);
		}

		// Retrieve artifacts
		const retrieved = yield* storage.getArtifacts(messageId);

		// Get stats
		const stats = yield* storage.getStorageStats();

		return { extracted, retrieved, stats };
	});

	const testLayer = Layer.mergeAll(
		extractionLayer || createMockArtifactExtractionService(),
		storageLayer || createMockArtifactStorageService(),
	);

	const runtime = ManagedRuntime.make(testLayer as any);
	return runtime.runPromise(program);
}

/**
 * Helper to create a temporary storage context for isolated tests
 */
export function createTestStorageContext() {
	const storage = new Map<string, Artifact[]>();

	return {
		save: (messageId: string, artifacts: Artifact[]) => {
			storage.set(messageId, [...artifacts]);
		},
		get: (messageId: string) => {
			return storage.get(messageId) || [];
		},
		delete: (messageId: string) => {
			storage.delete(messageId);
		},
		clear: () => {
			storage.clear();
		},
		getAll: () => {
			return Array.from(storage.entries());
		},
		size: () => {
			return storage.size;
		},
	};
}

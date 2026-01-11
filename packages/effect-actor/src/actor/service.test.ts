import { Effect, Layer } from "effect";
import { describe, expect, test } from "vitest";
import type { AuditEntry } from "../audit.js";
import { GuardFailedError, SpecNotFoundError, StorageError } from "../errors.js";
import { ContentProductionSpec } from "../examples/content-production.js";
import { ComputeProvider } from "../providers/compute.js";
import { StorageProvider } from "../providers/storage.js";
import { SpecRegistry } from "../spec/registry.js";
import type { ActorSpec } from "../spec/types.js";
import { ActorService } from "./service.js";
import { AuditLog } from "../audit.js";
import type { ActorState } from "./types.js";

// In-memory storage for tests
const createInMemoryStorageLayer = () => {
	const states = new Map<string, ActorState>();
	const audits = new Map<string, AuditEntry[]>();

	return Layer.succeed(StorageProvider, {
		_tag: "effect-actor/StorageProvider" as const,
		save: (actorType: string, actorId: string, state: ActorState, audit: AuditEntry) =>
			Effect.sync(() => {
				const key = `${actorType}:${actorId}`;
				console.log(`[STORAGE] save ${key} -> ${state.state}`);
				states.set(key, state);
				const auditList = audits.get(key) || [];
				audits.set(key, [audit, ...auditList]);
			}),
		load: (actorType: string, actorId: string) =>
			Effect.gen(function* () {
				const key = `${actorType}:${actorId}`;
				console.log(`[STORAGE] load ${key}, have: ${Array.from(states.keys()).join(",")}`);
				const state = states.get(key);
				if (!state) {
					return yield* Effect.fail(new StorageError({
						backend: "test",
						operation: "load",
						reason: `Actor not found: ${key}`,
					}));
				}
				return state;
			}),
		query: (actorType: string, filter?: any) =>
			Effect.sync(() => {
				const results: ActorState[] = [];
				for (const [key, state] of states.entries()) {
					if (key.startsWith(`${actorType}:`)) {
						results.push(state);
					}
				}
				return results;
			}),
		getHistory: (actorType: string, actorId: string, limit?: number, offset?: number) =>
			Effect.sync(() => {
				const key = `${actorType}:${actorId}`;
				const history = audits.get(key) || [];
				return history.slice(offset || 0, (offset || 0) + (limit || 100));
			}),
	});
};

// Helper to run Effect programs with fresh services
const runTest = <A, E>(effect: Effect.Effect<A, E, any>) => {
	// Provide test storage (StorageProvider has no default)
	const testStorageLayer = createInMemoryStorageLayer();

	// Provide test ComputeProvider
	const testComputeLayer = Layer.effect(ComputeProvider, Effect.succeed({
		_tag: "effect-actor/ComputeProvider" as const,
		now: () => Effect.sync(() => new Date()),
		uuid: () => Effect.sync(() => crypto.randomUUID()),
		estimateReadingTime: (text: string) =>
			Effect.sync(() => Math.ceil(text.split(/\s+/).length / 200)),
	}));

	// Provide test AuditLog
	const testAuditLogLayer = Layer.succeed(AuditLog, {
		record: () => Effect.void,
		query: () => Effect.succeed([]),
		replay: () => Effect.fail(new Error("Not implemented")),
	} as any);

	// Create layers for each dependency
	const depLayers = Layer.mergeAll(
		testStorageLayer,
		SpecRegistry.Default, // Use fresh real registry
		testComputeLayer,
		testAuditLogLayer,
	);

	// Create the full effect with all dependencies available
	const effect_with_deps = effect.pipe(
		Effect.provide(ActorService.Default),
		Effect.provide(depLayers),
	);

	// Run the effect 
	return effect_with_deps
		.pipe(Effect.runPromise as any) as Promise<A>;
};

/**
 * Integration tests for ActorService
 *
 * Coverage:
 * - Full workflow execution (multi-step transitions)
 * - State persistence and reload
 * - Audit trail recording
 * - Guard evaluation in workflows
 * - Action execution across transitions
 * - Context evolution through workflow
 */
describe("ActorService - Integration Tests", () => {
	describe("Content Production Workflow", () => {
		test("should execute full happy path: draft → review → published", async () => {
			const program = Effect.gen(function* () {
				const registry = yield* SpecRegistry;
				const service = yield* ActorService;

				yield* registry.register(ContentProductionSpec);

				// Create article in draft state
				const createResult = yield* service.execute({
					actorType: "content-production",
					actorId: "article-1",
					event: "CREATE",
					data: {
						title: "Getting Started with Effect",
						body: "Content ".repeat(20),
						author: "john@example.com",
					},
				});

				expect(createResult.from).toBe("draft");
				expect(createResult.to).toBe("draft");

				// Submit for review (draft → review)
				const submitResult = yield* service.execute({
					actorType: "content-production",
					actorId: "article-1",
					event: "SUBMIT_FOR_REVIEW",
					data: {
						reviewer: "default-reviewer@example.com",
					},
				});

				// 2. Verify state was persisted
				const state1 = yield* service.query("content-production", "article-1");
				expect(state1.state).toBe("review");
				expect(state1.version).toBe(2);

				// 3. Approve article (review → published)
				const approveResult = yield* service.execute({
					actorType: "content-production",
					actorId: "article-1",
					event: "APPROVE",
				});

				expect(approveResult.from).toBe("review");
				expect(approveResult.to).toBe("published");
				expect(approveResult.newContext.publishedAt).toBeInstanceOf(Date);

				// 4. Verify final state
				const finalState = yield* service.query(
					"content-production",
					"article-1",
				);
				expect(finalState.state).toBe("published");
				expect(finalState.version).toBe(3);
				expect(finalState.context).toMatchObject({
					title: "Getting Started with Effect",
					author: "john@example.com",
					reviewer: "default-reviewer@example.com",
				});

				// 5. Verify audit trail
				const history = yield* service.getHistory(
					"content-production",
					"article-1",
				);
				expect(history).toHaveLength(3);
				expect(history[0].event).toBe("APPROVE");
				expect(history[0].from).toBe("review");
				expect(history[0].to).toBe("published");
				expect(history[1].event).toBe("SUBMIT_FOR_REVIEW");
				expect(history[1].from).toBe("draft");
				expect(history[1].to).toBe("review");
				expect(history[2].event).toBe("CREATE");
				expect(history[2].from).toBe("draft");
				expect(history[2].to).toBe("draft");
			});

			await runTest(program);
		});

		test("should handle rejection path: review → draft", async () => {
			const program = Effect.gen(function* () {
				const registry = yield* SpecRegistry;
				const service = yield* ActorService;

				yield* registry.register(ContentProductionSpec);

				// Create and submit article
				yield* service.execute({
					actorType: "content-production",
					actorId: "article-2",
					event: "CREATE",
					data: {
						title: "Test Article",
						body: "Content ".repeat(20),
						author: "author@example.com",
					},
				});

				yield* service.execute({
					actorType: "content-production",
					actorId: "article-2",
					event: "SUBMIT_FOR_REVIEW",
					data: {
						reviewer: "reviewer@example.com",
					},
				});

				// Reject (review → draft)
				const rejectResult = yield* service.execute({
					actorType: "content-production",
					actorId: "article-2",
					event: "REJECT",
					data: {
						feedback: "Needs more details",
					},
				});

				expect(rejectResult.from).toBe("review");
				expect(rejectResult.to).toBe("draft");
				expect(rejectResult.newContext.feedback).toBe("Needs more details");

				// Verify state persisted
				const state = yield* service.query("content-production", "article-2");
				expect(state.state).toBe("draft");
				expect(state.version).toBe(3);
			});

			await runTest(program);
		});

		test("should enforce guard: cannot publish without sufficient content", async () => {
			const program = Effect.gen(function* () {
				const registry = yield* SpecRegistry;
				const service = yield* ActorService;

				yield* registry.register(ContentProductionSpec);

				// Create article with insufficient content
				yield* service.execute({
					actorType: "content-production",
					actorId: "article-3",
					event: "CREATE",
					data: {
						title: "Short",
						body: "Too short",
						author: "author@example.com",
					},
				});

				yield* service.execute({
					actorType: "content-production",
					actorId: "article-3",
					event: "SUBMIT_FOR_REVIEW",
					data: {
						reviewer: "reviewer@example.com",
					},
				});

				// Try to approve - should fail due to content guard
				const approveAttempt = yield* Effect.either(service.execute({
					actorType: "content-production",
					actorId: "article-3",
					event: "APPROVE",
				}));

				// Guard should prevent transition
				expect(approveAttempt._tag).toBe("Left"); // Should fail
				expect((approveAttempt as any).left).toBeInstanceOf(GuardFailedError);

				// Verify state didn't change
				const state = yield* service.query("content-production", "article-3");
				expect(state.state).toBe("review");
				expect(state.version).toBe(2);
			});

			await runTest(program);
		});
	});
});
